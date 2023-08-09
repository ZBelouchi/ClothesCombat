import React, { useState, useEffect } from 'react'
import useToggle from './useToggle'

export default function useTimer(initial, onZero=()=>{}) {
    const [seconds, setSeconds] = useState(initial)
    const [isPaused, toggleIsPaused] = useToggle(false)

    useEffect(() => {
        const interval = setInterval(
            () => {
                // action
                if (isPaused) return
                if (seconds === 0) {
                    toggleIsPaused(true)
                    onZero()
                    return
                }
                setSeconds(seconds - 1)
            }, 
            1000
        )
        return () => {
            clearInterval(interval)
        }
    }, [seconds, isPaused])

    const setTimer = (value, pause=false) => {
        setSeconds(value)
        if (pause) {
            toggleIsPaused(true)
        }
    }

    return {
        timer: seconds,
        isPaused,
        timerMax: initial,
        setTimer,
        resetTimer: (pause=true) => setTimer(initial, pause),
        togglePause: toggleIsPaused,
    } 
}
