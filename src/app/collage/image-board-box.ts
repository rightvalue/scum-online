import { fabric } from 'fabric'

class Rect {
  left: number
  top: number
  width: number
  height: number

  constructor(left, top, width, height) {
    this.left = left
    this.top = top
    this.width = width
    this.height = height
  }
}

class ImageBoardBox {
  url: string
  canvas: fabric.Canvas
  image: fabric.Image
  offsetX: number = 0
  offsetY: number = 0
  initialScale: number = 1.0
  scale: number = 1.0
  zoom: number = 1.0
  brightness: number = 0.01
  maskRect: fabric.Rect
  boardRect: fabric.Rect
  controlBox: fabric.Rect
  controlBoxPos: fabric.Point
  cropRect: Rect = null
  tag: string
  boardWidth: number = 0
  boardHeight: number = 0
  strokeColor: string = 'rgb(136, 0, 26)'
  strokeWidth: number = 0

  constructor(canvas) {
    this.canvas = canvas
    this.canvas.on('mouse:down', (e) => this.onMouseDown(e))
    this.canvas.on('object:moving', (e) => this.onObjectMoving(e))
    this.canvas.on('object:moved', (e) => this.onObjectMoved(e))
    this.canvas.on('object:scaling', (e) => this.onObjectScaling(e))
  }

  setImageOffset(offsetX, offsetY) {
    this.offsetX = offsetX
    this.offsetY = offsetY
    return this
  }

  setTag(tag) {
    this.tag = tag
    return this
  }

  setScale(scale) {
    this.scale = scale
    return this
  }

  setBoard(boardWidth, boardHeight) {
    this.boardWidth = boardWidth
    this.boardHeight = boardHeight
    this.createBoard()
    return this
  }

  setBorder(borderWidth, borderColor) {
    this.strokeWidth = borderWidth
    this.strokeColor = borderColor
    return this
  }

  getImageInfo() {
    return {
      url: '', //this.url,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      initialScale: this.initialScale,
      scale: this.scale,
      zoom: this.zoom,
      brightness: this.brightness,
      cropRect: this.cropRect
    }
  }

  getImageUrl() {
    return this.url
  }

  setImageUrl(url) {
    this.url = url
    if (this.url) {
      fabric.Image.fromURL(this.url, (img) => this.onImageLoaded(img), {crossOrigin: 'anonymous'})
    }
    return this
  }

  private onImageLoaded(img) {
    this.image = img
    this.updateClipPath(this.offsetX, this.offsetY)
    this.updateImage()
    this.canvas.add(this.image)

    this.createControlBox()
    this.controlBoxPos = new fabric.Point(this.controlBox.left, this.controlBox.top)
  }

  setBrightness(value) {
    this.brightness = value
    var filter = new fabric.Image.filters.Brightness({
      brightness: value
    });
    this.image.filters = [filter];
    this.image.applyFilters();
    this.canvas.renderAll()
  }

  setZoomScale(zoom) {
    this.zoom = zoom
    this.update()
  }

  deleteImage() {
    this.canvas.remove(this.image)
    this.canvas.remove(this.controlBox)
  }

  restoreImage() {
    this.cropRect = null
    this.update()
  }

  onImageChanged(zoom, brightness) {
    console.log('onImageChanged', zoom, brightness)
    this.zoom = zoom
    this.brightness = brightness
    this.update()
  }

  onImageCropped(left, top, width, height) {
    console.log('ImageCropped', left, top, width, height)
    this.cropRect = new Rect(left, top, width, height)
    this.update()
  }

  update() {
    this.updateClipPath(this.offsetX, this.offsetY)
    this.updateImage()
    this.updateControlBox()
    this.setBrightness(this.brightness)
    this.canvas.renderAll()
  }

  private updateImage() {
    const iw = this.image.width
    const ih = this.image.height
    const bw = this.scale * iw
    const bh = this.scale * ih
    const cx = this.offsetX + bw / 2
    const cy = this.offsetY + bh / 2

    let offsetX, offsetY, scaleX, scaleY;
    if (this.cropRect) {
      const rect = this.cropRect

      scaleX = bw / rect.width
      scaleY = bh / rect.height

      offsetX = this.offsetX - scaleX * rect.left
      offsetY = this.offsetY - scaleY * rect.top
    }
    else {
      scaleX = this.scale * this.zoom
      scaleY = this.scale * this.zoom

      const dw = iw * scaleX
      const dh = ih * scaleY
      offsetX = cx - dw / 2
      offsetY = cy - dh / 2
    }

    this.image.set({
      type: this.tag,
      left: offsetX,
      top:  offsetY,
      scaleX: scaleX,
      scaleY: scaleY,
      selectable: false,
      evented: false
    })

    this.image.setControlsVisibility({
      mtr: false,
    })
  }

  private updateClipPath(left, top) {
    const width = this.image.width * this.scale
    const height = this.image.height * this.scale

    if (!this.image.clipPath) {
      let maskRect = new fabric.Rect({
        originX: 'left',
        originY: 'top',
        left: left,
        top: top,
        width: width,
        height: height,
        absolutePositioned: true,
      })
      this.image.clipPath = maskRect
    }
    else {
      this.image.clipPath.set({
        left: left,
        top: top,
        width: width,
        height: height,
      })
    }
  }

  private createBoard() {
    this.boardRect = new fabric.Rect({
      type: this.tag,
      originX: 'left',
      originY: 'top',
      left: this.offsetX,
      top: this.offsetY,
      width: this.boardWidth,
      height: this.boardHeight,
      fill: 'rgb(215,215,215)',
      absolutePositioned: true,
      selectable: false,
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      padding: 0,
    })

    this.canvas.add(this.boardRect)
  }

  private createControlBox() {
    this.controlBox = new fabric.Rect({
      type: this.tag,
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      width: 1,
      height: 1,
      opacity: 1.0,
      fill: 'rgba(255,255,255, 0)',
      absolutePositioned: true,
      //lockMovementX: true,  // Moveable
      //lockMovementY: true,
      lockScalingFlip: true,
      selectable: true,
      transparentCorners: false,
      cornerColor: 'white',
      cornerStrokeColor: 'black',
      borderColor: 'black',
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      cornerSize: 12,
      padding: 0,
      cornerStyle: 'circle',
      borderDashArray: [5, 5],
      borderScaleFactor: 1.3
    })

    this.controlBox.setControlsVisibility({mb: false, ml: false, mr: false, mt: false, mtr: false})
    this.updateControlBox()
    this.canvas.add(this.controlBox)
  }

  private updateControlBox() {
    const width = this.image.width * this.scale
    const height = this.image.height * this.scale
    this.controlBox.set({
      left: this.offsetX,
      top: this.offsetY,
      width: width,
      height: height,
    })
  }

  onMouseDown(e) {
    if (e.target && e.target.type == this.tag) {
      this.canvas.bringToFront(this.image)
      this.canvas.bringToFront(this.controlBox)
      this.canvas.setActiveObject(this.controlBox)
    }
  }

  onObjectMoving(e) {
    if (e.target.type == this.tag) {
      const dx = e.target.left - this.controlBoxPos.x
      const dy = e.target.top - this.controlBoxPos.y
      this.image.left += dx
      this.image.top  += dy
      this.offsetX += dx
      this.offsetY += dy

      this.controlBoxPos = new fabric.Point(e.target.left, e.target.top)
      this.updateClipPath(this.controlBoxPos.x, this.controlBoxPos.y)
    }
  }

  onObjectMoved(e) {
    if (e.target.type == this.tag) {
      if (e.target.left > this.canvas.width) {
        e.target.left = this.canvas.width - e.target.width
      }
      if (e.target.top > this.canvas.height) {
        e.target.top = this.canvas.height - e.target.height
      }
      if (e.target.left + e.target.width < 0) {
        e.target.left = 0
      }
      if (e.target.top + e.target.height < 0) {
        e.target.top = 0
      }
      this.onObjectMoving(e)
      this.canvas.renderAll()
    }
  }

  onObjectScaling(e) {
    if (e.target.type == this.tag) {
      this.scale = this.initialScale * e.target.scaleX
      this.offsetX = e.target.left
      this.offsetY = e.target.top
      this.updateImage()

      this.controlBoxPos = new fabric.Point(e.target.left, e.target.top)
      this.updateClipPath(e.target.left, e.target.top)
    }
  }

}

export default ImageBoardBox
