import { useRef, useEffect } from "react"
import useArray from "../hooks/useArray"

export default function Design({frames, backgroundColor, animated=true}) {
    const {array: layers, set: setLayers, remove: removeLayers} = useArray((() => {
        if (!animated) return [frames[0]]
        return frames
    })())
    const isFinished = useRef(false)

    // reset layers if frames updates (should happen automatically but doesn't for some reason)
    useEffect(() => {
        setLayers((() => {
            if (!animated) return [frames[0]]
            return frames
        })())
    }, [frames])
    
    let t
    useEffect(() => {
        if (layers.length > 1) {
            t = setTimeout(() => {
                removeLayers(-1)
            }, (70 * (0.95**frames.length) + 1))    // delay between frames decreases exponentially with more frames
        } else {
            isFinished.current = true
            clearTimeout(t)
        }
        
    }, [layers])
    return (
        <>
            <div className="design">
                {layers?.map((layer, index) => (
                    <>
                        <img className='design__layer' style={{backgroundColor: backgroundColor}} src={layer} alt="design layer" key={`design-layer-${index}`} />
                    </>
                ))}
            </div>
        </>
    )
}