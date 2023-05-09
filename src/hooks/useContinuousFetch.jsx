import {useState, useEffect, useRef} from 'react'

export default function useContinuousFetch(url, {options={}, parser=(res => res), onFailure=(err => {}), delay=0, refreshDelay=1000, initial=null, isPaused=false, runAtLeastOnce=true}) {
    const [value, setValue] = useState(initial)
    const hasRun = useRef(!runAtLeastOnce)
    const paused = useRef(isPaused)

    const set = ({value=initial, pause=false}) => {
        setValue(value)
        if (pause) {
            paused.current = true
        }
    }

    useEffect(() => {
        paused.current = isPaused
    }, [isPaused])

    useEffect(() => {
        const interval = setInterval(
            () => {
                if (paused.current && hasRun.current) return
                fetch(url, {...options})
                    .then(response => response.json())
                    .then(res => {
                        setValue(parser(res))
                        hasRun.current = true
                    })
                    .catch(err => {
                        setValue(onFailure(err))
                    })
            },
            hasRun.current ? refreshDelay : delay 
        )
        return () => {
            clearInterval(interval)
        }
    }, [paused, runAtLeastOnce, hasRun.current])

    return [value, set]
}

/* useContinuousFetch - repeatedly fetch a url and cache the returned value between fetches

    // basic get request
    const [playerList, setPlayerList] = useContinuousFetch('http://localhost:3000/players')

    // returns fetched value
    playerList

    // and function to set new value manually
    setPlayerList({value: 'new'})   // value sets new value (if not given, will reset to initial value)
    setPlayerList({pause: true})    // flag for pausing the fetch after setting to new value (is false by default)


    // pass in  destructured options for the request an it's behavior
    const [playerList, setPlayerList] = useContinuousFetch('http://localhost:3000/players', {
        options: {                                              // fetch options
            method: 'GET', 
            headers: {'Content-Type': 'application/json'}
        },
        parser: (res => {               // function run on success that processes response into returned data 
            return res.data                 //NOTE: parser's returned value is saved to the hook's value for use
        }),
        onFailure: (err => {            // function run on failure that handles error from fetching 
            return err.message              //NOTE: onFailure's returned value is saved to the hook's value for use, for providing backup values in case of failure
        })
        delay: 1000                     // time before first fetch cycle (in ms)
        refreshDelay: 1000              // time between following fetch cycles (in ms)
        initial: null                   // initial value before first fetch cycle finishes
        isPaused: true                  // flag for preventing recurring fetches
        runAtLeastOnce: true            // flag that forces at least one fetch to run on mount (even if paused)
    })


    // without storing the value or set function, the fetch will still run it's request action
    useContinuousFetch('http://localhost:3000/player', {
        options: {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: {data: 'some data}
        }
    })

*/