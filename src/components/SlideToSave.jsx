import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function SlideToSave({ label = 'SLIDE TO SAVE ENTRY', onComplete }) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, x: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => {
    const thumb = thumbRef.current
    const track = trackRef.current
    const fill = track.querySelector('.slider-fill')
    const maxTravel = () => track.offsetWidth - thumb.offsetWidth - 8

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX)

    const reset = () => {
      drag.current.x = 0
      thumb.style.transition = 'transform .3s ease-out'
      fill.style.transition = 'width .3s ease-out'
      thumb.style.transform = 'translateX(0px)'
      fill.style.width = '0px'
    }

    const start = (e) => {
      drag.current.active = true
      drag.current.startX = getX(e) - drag.current.x
      thumb.style.transition = 'none'
      fill.style.transition = 'none'
    }
    const move = (e) => {
      if (!drag.current.active) return
      const x = Math.min(Math.max(getX(e) - drag.current.startX, 0), maxTravel())
      drag.current.x = x
      thumb.style.transform = `translateX(${x}px)`
      fill.style.width = `${x + thumb.offsetWidth / 2}px`
    }
    const end = async () => {
      if (!drag.current.active) return
      drag.current.active = false
      if (drag.current.x > maxTravel() * 0.8) {
        const ok = await onComplete()
        if (ok) {
          thumb.style.transition = 'transform .2s ease-out'
          fill.style.transition = 'width .2s ease-out'
          thumb.style.transform = `translateX(${maxTravel()}px)`
          fill.style.width = '100%'
          fill.style.background = 'rgba(0,208,156,0.9)'
          setDone(true)
          setTimeout(() => {
            fill.style.background = ''
            setDone(false)
            reset()
          }, 500)
          return
        }
      }
      reset()
    }

    thumb.addEventListener('mousedown', start)
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', end)
    thumb.addEventListener('touchstart', start, { passive: true })
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', end)
    return () => {
      thumb.removeEventListener('mousedown', start)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', end)
      thumb.removeEventListener('touchstart', start)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', end)
    }
  }, [onComplete])

  const onKeyDown = async (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      await onComplete()
    }
  }

  return (
    <div className="slide-wrap">
      <div className="slider-track" ref={trackRef}>
        <div className="slider-fill" />
        <div
          className="slider-thumb"
          ref={thumbRef}
          tabIndex={0}
          role="button"
          aria-label="Slide to save entry, or press Enter to save"
          onKeyDown={onKeyDown}
        >
          <Icon name={done ? 'check' : 'double_arrow'} filled size={24} />
        </div>
        <div className="slider-text">{label}</div>
      </div>
    </div>
  )
}
