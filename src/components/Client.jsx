import React, {useRef, useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom'

import useValidate from '../hooks/useValidate'
import useContinuousFetch from '../hooks/useContinuousFetch'

import Form from './Form'
import Shirt from './Shirt'
import useObject from '../hooks/useObject'
import IMAGES from '../assets/images'
const DEBUG_MODE = Number(import.meta.env.VITE_DEBUG_MODE)
/* TODOS
    Join
        TODO: add some indication of if the server cannot be reached (either idly or on submit)
        TODO: add requirements to join form (both name and phrase must have at least 1 character)
        TODO: prevent additional submissions during processing; e.g. go to loading state while awaiting response
    Round
        TODO: add shirt archives/download component and link to it in results
        TODO: change mouse icon to pencil or brush or something when hovering over canvas
        TODO: save drawing strokes/other play stuff in session storage in case of refresh
        CLEAN: editMode
        TODO: prevent empty canvas by only using eraser strokes or clear
        TODO: prune frames from design if there's too many to send reasonably (like in extreme cases where frames take up 3 digit mbs)
        BUG: sometimes there's a prop reading error or something that prevents drawings being sent
        CLEAN: now that I caved and added ids to objects, go back and clean up the code I used to get ids the hard way
        BUG: (in <Voting/>) refreshing during presentation of winners causes it to get stuck in loading (doesn't affect seamless gameplay, but should fix so if it refreshes for some reason it wont break)
        TODO: prevent submitting a response in the time between rounds, as it may submit to the next phase (i.e. submitting a slogan after the last 4th will count as 1 submission for the combining phase and lot let you make a shirt)
        BUG: fix repeating animation in designs, should only play once
        CLEAN: add this name key system (iconForm>iconData) to other parts of the project, it'll clean things up a lot
        TODO: stop spectators from voting when current vote has concluded and it's showing who had more votes*
        TODO: add character limit (70) to slogans
        CLEAN: add useReduce hook to combining phase for cleaner code
*/

export default function Client() {
    const nav = useNavigate()
    const report = useValidate({
        strict: false,
        player: localStorage.getItem('playerUUID'),
        session: localStorage.getItem('sessionUUID'),
        spectator: localStorage.getItem('spectatorUUID')
    })

    //DEBUG: automatically route session and server visualizer back after refresh
    useEffect(() => {
        switch (localStorage.getItem('DEBUG-initRoute')) {
            case 'session':         // 5173
                nav('/session')
                break
            case 'server':          // 5172
                nav('/server')
                break
        }
    }, [])

    if (report) {
        const {inProgress, session, player, spectator} = report
        if (inProgress) {
            // if game is in progress, check for existing id to rejoin
            if (session && player) {
                // console.log("resumePlayer()")
                return <Round />
            } else if (session && spectator) {
                // console.log("resumeSpectator()")
                return <Audience />
            } else {
                // if no valid id is found, join as spectator
                return (
                    // Join as Spectator
                    <>
                        <p>a game is already in progress</p>
                        <button onClick={() => {
                            fetch(`${import.meta.env.VITE_SERVER_URL}/spectator`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'}
                            })
                                .then(response => response.json())
                                .then(res => {
                                    console.log(res)

                                    // add spectator uuids to storage for later
                                    if (!DEBUG_MODE) {
                                        localStorage.removeItem('playerUUID')
                                    } else {
                                        console.log("DEBUG MODE: remove playerUUID")
                                    }
                                    localStorage.setItem('spectatorUUID', res.spectatorId)
                                    localStorage.setItem('sessionUUID', res.sessionId)
                                    // navigate to round as spectator
                                    return <Audience />
                                })

                        }}>Join Audience</button>
                    </>
                )
            }
        } else {
            if (session && player) {
                // console.log("resumePlayer()")
                return <IconForm />
            }
            return (
                <>
                    <PlayerForm />
                    <button onClick={() => nav('./session')}>Host Session</button>
                    <button onClick={() => nav('./server')}>View Data (DEBUG)</button>
                </>
            )
        }
    }
}

function PlayerForm() {
    const {object: formData, update: updateFormData} = useObject({
        name: '',
        phrase: ''
    })
    
    const handleSubmit = e => {
        e.preventDefault()
        console.log(formData);
        fetch(`${import.meta.env.VITE_SERVER_URL}/player`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.name, 
                phrase: formData.phrase,
                icon: null 
            })
        })
            .then(response => {
                // internal error handling
                if (!response.ok) {
                    response.json()
                        .then(res => {
                            throw new Error(res.message)
                        })
                        .catch(err => alert(err.message))
                }
                return response.json()
            })
            .then(res => {
                // add player uuids) to storage for later
                if (!DEBUG_MODE) {
                    localStorage.removeItem('spectatorUUID')
                } else {
                    console.log("DEBUG MODE: remove spectatorUUID")
                }
                localStorage.setItem('playerUUID', res.playerId)
                localStorage.setItem('sessionUUID', res.sessionId)
            })
            .catch(err => console.log("FETCH ERROR:", err.message))
    }

    return (
        <form onSubmit={handleSubmit}>
            <label>
                Name:
                <input type="text" value={formData.name} onChange={e => updateFormData({name: e.target.value})} autoFocus/>            
            </label>
            <label>
                Victory Phrase:
                <input type="text" value={formData.phrase} onChange={e => updateFormData({phrase: e.target.value})}/>            
            </label>
            <input type="submit" value="Join" />
        </form>
    )
}

function IconForm() {
    const [iconData, setIconData] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/icons`, {
        parser: res => ({
            icons: res.icons,
            nameKey: res.nameKey        
        }),
        refreshDelay: 500,
        initial: {icons: [], nameKey: {huh: 'better not see this'}},
        // isPaused: true
    })

    if (iconData.icons.length === 0) return 'loading icons'
    
    return (
        <div className='grid'>
            {
                iconData.icons.map((icon, index) => (
                    <button 
                        style={{color: 'black', backgroundColor: icon !== null ? 'gray' : 'initial'}}
                        disabled={icon !== null}
                        onClick={() => {
                            fetch(`${import.meta.env.VITE_SERVER_URL}/icon/${index}`, {
                                method: 'PATCH',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    player: localStorage.getItem('playerUUID')
                                })
                            })
                                .then(response => response.json())
                                .then(res => {
                                    setIconData({
                                        newValue: {
                                            icons: res.icons,
                                            nameKey: res.nameKey
                                        }
                                    })
                                })
                                .catch(err => console.log(err))
                        }}
                    >
                        <img src={IMAGES.icons[index]} alt="" className='icon--med' />
                        <p>{index}: {iconData.nameKey[iconData.icons[index]]}</p>
                    </button>
                ))
            }
        </div>
    )
}

function Round() {
    const nav = useNavigate()
    const [gameData, setGameData] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/all`, {
        parser: (res => {
            return {
                id: res.sessionId,
                round: res.round,
                phase: res.phase,
                responses: res.responses,
                limit: res.limit,
                votes: res.votes,
            }
        })
    })

    useValidate({
        player: localStorage.getItem('playerUUID'),
        session: localStorage.getItem('sessionUUID'),
        onInvalid: (() => {
            if (gameData === null) return
            if (!DEBUG_MODE) {
                localStorage.removeItem('sessionUUID')
                localStorage.removeItem('playerUUID')
                localStorage.removeItem('spectatorUUID')
            } else {
                console.log("DEBUG MODE: remove sessionUUID")
                console.log("DEBUG MODE: remove playerUUID")
                console.log("DEBUG MODE: remove spectatorUUID")
            }
            nav('..')
        }),
        dependencies: [gameData]
    })
    
    if (gameData === null) return 'loading...'
    return (
        <div>
            <p>ROUND {gameData.round}</p>
            {(() => {
                if (gameData.round === 0) return <Waiting text={"Waiting for game to begin"} />
                if (gameData.round === 4) return <Results />
                if (gameData.phase != 2 && gameData.responses[localStorage.getItem('playerUUID')] === gameData.limit) {
                    return <Waiting text={"Waiting for others to finish..."}/>
                }
                switch (gameData.phase) {
                    case 1: return <Canvas />
                    case 2: return <Slogan />
                    case 3: return <Combining round={gameData.round}/>
                    case 4: return <Voting key={gameData.round} votes={gameData.votes || {}} round={gameData.round}/>
                }
            })()}
        </div>
    )
}

function Waiting({text}) {
    return <p>{text}</p>
}
function Canvas() {
    // lists
    const colors = ['black', 'red', 'blue', 'green', 'yellow', 'white', 'pink', 'purple', 'orange']
    const widths = [1, 5, 10, 15, 20, 30]
    const backgrounds = ['gray', 'navy', 'salmon', 'lightblue', 'lime', '#ffff66', 'darkgray']
    // paint tools
    const [color, setColor] = useState("black")
    const [width, setWidth] = useState(10)
    const [backgroundColor, setBackgroundColor] = useState('gray')
    const [editMode, setEditMode] = useState('source-over')
    // strokes
    const strokes = useRef([])
    const strokePoints = useRef([])
    const undoneStrokes = useRef([])

    // element ref for canvas element
    const canvasRef = useRef(null)
    // state tracking whether user is currently painting on the canvas
    const [isPainting, setIsPainting] = useState(false)
    // state tracking user's mouse position coords (x and y)
    const [mouseCoordinates, setMouseCoordinates] = useState({ x: 0, y: 0 })

    // begin 'painting' if pointer clicked/touched canvas
    const startPaint = (event) => {
        // do nothing if not on canvas?
        const canvas = canvasRef.current
        if (!canvas) {
            
        }
        // toggle painting state to true and set mouse coords 
        setIsPainting(true)
        setMouseCoordinates({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })
        strokePoints.current = [{ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }]
    }

    // paint to canvas
    const paint = (event) => {
        // do nothing if painting state is false
        if (!isPainting) {
            return
        }
        // do nothing if pointer is off canvas
        const canvas = canvasRef.current
        if (!canvas) {
            
        }
        // define context for the canvas to perform actions via methods later
        const context = canvas.getContext("2d")
        if (!context) {
            
        }

        // change stroke styles
        context.globalCompositeOperation = editMode
        context.strokeStyle = color
        context.lineWidth = width
        context.lineCap = "round"
        context.lineJoin = "round"

        // resets path clearing the previous sub paths
        context.beginPath()
        // moves starting position to mouse coordinates
        context.moveTo(mouseCoordinates.x, mouseCoordinates.y)
        // update points list for storing the stroke later
        strokePoints.current = [...strokePoints.current, { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }]
        // update mouse coordinates (updates state as long as mouse is down to prevent drawing until all sub-paths are in place)
        setMouseCoordinates({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })
        // connects last two points with a line
        context.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY)

        // draws on that line using stroke styles
        context.stroke()
    }
    const exitPaint = (event) => {
        // do nothing if not painting
        if (!isPainting) return
        // toggle painting off
        setIsPainting(false)

        // add fallback point in case of dot (single click)
        if (strokePoints.current.length <= 1) {
            strokePoints.current = [{ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }, { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }]
            // draw dot that was missed by paint
            // prep canvas
            const canvas = canvasRef.current
            const context = canvas.getContext("2d")
            context.globalCompositeOperation = editMode
            context.strokeStyle = color
            context.lineWidth = width
            context.lineCap = "round"
            context.lineJoin = "round"
            // draw point
            context.beginPath()
            context.moveTo(mouseCoordinates.x, mouseCoordinates.y)
            setMouseCoordinates({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })
            context.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
            context.stroke()
        }

        // add new stroke to strokes list
        strokes.current.push({
            color: color,
            width: width,
            editMode: editMode,
            points: strokePoints.current
        })
        // clear points used by stroke list for next stroke
        strokePoints.current = []
        // clear undone strokes
        undoneStrokes.current = []
    }

    function drawStrokes(generateFrames=false) {
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")
        const frames = []
        context.fillStyle = backgroundColor
        // context.fillRect(0, 0, canvas.width, canvas.height)
        strokes.current.forEach((stroke) => {
            if (generateFrames && stroke.editMode === 'destination-out') {
                context.globalCompositeOperation = 'source-over'
                context.strokeStyle = backgroundColor
            } else {
                context.globalCompositeOperation = stroke.editMode
                context.strokeStyle = stroke.color
            }
            context.lineWidth = stroke.width
            context.lineCap = "round"
            context.beginPath()
            context.moveTo(stroke.points[0].x, stroke.points[0].y)
            for (let i = 1; i < stroke.points.length; i++) {
                context.lineTo(stroke.points[i].x, stroke.points[i].y)
            }
            context.stroke()
            if (generateFrames) {
                frames.push(canvas.toDataURL())
            }
        })
        return frames
    }
    
    function clearCanvas() {
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")
        context.clearRect(0, 0, canvas.width, canvas.height)
    }

    function undoStroke() {
        // pop last stroke from strokes list
        const pop = strokes.current.pop()
        // save it to undone list
        undoneStrokes.current.push(pop)
        clearCanvas()
        drawStrokes()
    }
    function redoStroke() {
        // do nothing if undone list empty
        if (undoneStrokes.current.length === 0) return
        // pop latest undone stroke from undone list
        const pop = undoneStrokes.current.pop()
        // add it back to strokes list
        strokes.current.push(pop)
        clearCanvas()
        drawStrokes()
    }

    return (
        <>
            <div className='flex'>
                <canvas
                    ref={canvasRef}
                    width= "400px"
                    height="400px"
                    onMouseDown={startPaint}
                    onMouseMove={paint}
                    onMouseUp={exitPaint}
                    onMouseLeave={exitPaint}
                    onTouchStart={startPaint}
                    onTouchMove={paint}
                    onTouchEnd={exitPaint}
                    style={{
                        backgroundColor: backgroundColor
                    }}
                />
                <div>
                    <h4>colors</h4>
                    <ul>
                        {colors.map(c => (
                            <li 
                                className={`color`} 
                                style={{backgroundColor: c}} 
                                key={`color-${c}`} 
                                onClick={() => {
                                    setColor(c)
                                    setEditMode('source-over')
                                }}
                            />
                        ))}
                        <li
                            className={`color`} 
                            key={"color-eraser"} 
                            onClick={() => {
                                setColor('black')
                                setEditMode('destination-out')
                            }}
                        />
                    </ul>
                    <h4>backgrounds</h4>
                    <ul>
                        {backgrounds.map(b => (
                            <li 
                                className={`background`} 
                                style={{backgroundColor: b}} 
                                key={`background-${b}`} 
                                onClick={() => setBackgroundColor(b)}
                            />
                        ))}
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                    </ul>
                    <h4>widths</h4>
                    <ul>
                        {widths.map(w => (
                            <li 
                                className={`width`} 
                                key={`width-${w}`} 
                                onClick={() => setWidth(w)}
                            >
                                <svg width="100%" height="100%">
                                    <circle
                                        cx="25"     
                                        cy="25"
                                        r={w / 2}
                                        strokeWidth="4"
                                        fill={color}
                                    />
                                </svg>
                            </li>
                        ))}
                    </ul>
                    <button onClick={() => undoStroke()}>Undo</button>
                    <button onClick={() => redoStroke()}>Redo</button>
                    <button onClick={() => {
                        clearCanvas()
                        if (strokes.current.includes('clear')) return 
                        strokes.current.push('clear')
                    }}>Clear</button>
                    <button onClick={() => {
                        if (strokes.current.length === 0 || [...strokes.current].toString() === 'clear') return 
                        // setup canvas
                        // const canvas = canvasRef.current
                        // const context = canvas.getContext('2d')

                        // context.fillStyle = backgroundColor
                        // context.globalCompositeOperation = 'destination-over'
                        // context.fillRect(0, 0, canvas.width, canvas.height)
                        
                        // const pngURL = canvas.toDataURL()
                        clearCanvas()
                        const frames = drawStrokes(true)
                        
                        // {png: pngURL, gifFrames: frames.reverse()}

                        const bodyContent = JSON.stringify({
                            creatorId: localStorage.getItem('playerUUID'),
                            backgroundColor: backgroundColor,
                            frames: frames
                        })
                        console.log(bodyContent.length)

                        fetch(`${import.meta.env.VITE_SERVER_URL}/design`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: bodyContent
                        })
                            .then(response => {
                                // internal error handling
                                if (!response.ok) {
                                    response.json()
                                        .then(res => {
                                            throw new Error(res.message)
                                        })
                                        .catch(err => console.log(err.message))
                                }
                                return response.json()
                            })
                            .then(res => {
                                // reset canvas for next design
                                clearCanvas()
                                setColor(colors[0])
                                setWidth(widths[2])
                                setBackgroundColor(backgrounds[0])
                                setEditMode('source-over')
                                strokes.current = []
                                strokePoints.current = []
                                undoneStrokes.current = []
                            })
                            .catch(err => console.log("FETCH ERROR:", err.message))
                    }}>DONE</button>
                </div>
            </div>            
        </>
    )
}
function Slogan() {
    const [input, setInput] = useState('')
    const inputRef = useRef()

    const handleSubmit = e => {
        e.preventDefault()
        inputRef.current.focus()
        fetch(`${import.meta.env.VITE_SERVER_URL}/slogan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: input,
                creatorId: localStorage.getItem('playerUUID')
            })
        })
            .then(response => {
                // internal error handling
                if (!response.ok) {
                    response.json()
                        .then(res => {
                            throw new Error(res.message)
                        })
                        .catch(err => console.log(err.message))
                }
                return response.json()
            })
            .then(res => {
                // console.log(res)
                setInput('')
            })
            .catch(err => console.log("FETCH ERROR:", err.message))
    }
    
    return (
        <>
            <form onSubmit={handleSubmit}>
                <label>
                    Write a catchy slogan
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        ref={inputRef} 
                        autoFocus/>
                </label>
                <input type="submit" value="Submit" />
            </form>
        </>
    )
}
function Combining({round}) {
    const [designs, setDesigns] = useState([])
    const [slogans, setSlogans] = useState([])
    const [designSelect, setDesignSelect] = useState(0)
    const [sloganSelect, setSloganSelect] = useState(0)
    const shirtMethods = useRef()

    useEffect(() => {
        fetch(`${import.meta.env.VITE_SERVER_URL}/parts/${localStorage.getItem('playerUUID')}`)
            .then(response => response.json())
            .then(res => {
                setDesigns(res.designs)
                setSlogans(res.slogans)
            })
    }, [])
    useEffect(() => {
        if (designs.length > 0) {
        }
    }, [designSelect])
    
    if (designs.length === 0) return 'loading...'
    
    return (
        <>
            <Shirt 
                design={designs[designSelect]} 
                slogan={slogans[sloganSelect]} 
                animated={false} 
                ref={shirtMethods}
                initialData={{
                    shirtRendered: true,
                    shirtVisible: true,
                    designVisible: true,
                    sloganVisible: true,
                    position: 'center'
                }}
            />
            <div className="flex">
                <p>Design</p>
                <button onClick={() => {
                    setDesignSelect(designSelect > 0 ? designSelect - 1 : designs.length-1)
                }}>{"<"}</button>
                <button onClick={() => {
                    setDesignSelect(designSelect < designs.length-1 ? designSelect + 1 : 0)
                }}>{">"}</button>
            </div>
            <div className="flex">
                <p>Slogan</p>
                <button onClick={() => {
                    setSloganSelect(sloganSelect > 0 ? sloganSelect - 1 : slogans.length-1)
                }}>{"<"}</button>
                <button onClick={() => {
                    setSloganSelect(sloganSelect < slogans.length-1 ? sloganSelect + 1 : 0)
                }}>{">"}</button>
            </div>
            <button onClick={() => {
                // POST shirt `${import.meta.env.VITE_SERVER_URL}/shirt` body=design, slogan, body
                fetch(`${import.meta.env.VITE_SERVER_URL}/shirt`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        designId: designs[designSelect].id,
                        sloganId: slogans[sloganSelect].id,
                        creatorId: localStorage.getItem('playerUUID'),
                        round: String(round)    //TODO: actually figure out why it changes between string to number by the round but for now this will work
                    })
                })
                    .then(response => response.json())
                    .then(res => {
                        console.log(res)
                    })
            }}>DONE</button>

        </>
    )
}
function Voting({votes, round}) {
    const [hasVoted, setHasVoted] = useState(false)
    const shirtAnimations = [useRef(), useRef()]
    const [candidates, setCandidates] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/shirts?status=${round !== 3 ? 'unused' : 'winner'}&deep=true&amount=2`, {
        parser: (res => {
            return res.shirts
        }),
        onFailure: (err => console.log(err)),
        initial: []
    })

    const submitVote = (shirt) => {
        fetch(`${import.meta.env.VITE_SERVER_URL}/vote`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                group: 'votes',
                id: localStorage.getItem('playerUUID'),
                shirt: shirt
            })
        })
            .then(response => response.json())
            .then(res => {
                // console.log(res.message)
            })
            .catch(err => console.log(err))
    }

    useEffect(() => {
        setHasVoted(Object.keys(votes).includes(localStorage.getItem('playerUUID')))
    }, [votes])

    if (Object.keys(candidates).length < 2) return "loading..."
    return (
        <>
            {hasVoted ? 
                (<p>waiting for next vote</p>)
                : 
                (
                    <div className="voting flex">
                        {candidates.map((candidate, index, array) => (
                            <>
                                <div>
                                    {/* <Shirt design={candidate.design} slogan={candidate.slogan} animated={true}/> */}
                                    <Shirt 
                                        design={candidate.design} 
                                        slogan={candidate.slogan} 
                                        animated={true} 
                                        ref={shirtAnimations[index]}
                                        initialData={{
                                            shirtRendered: true,
                                            shirtVisible: true,
                                            designVisible: true,
                                            sloganVisible: true,
                                            position: ['leftCenter', 'rightCenter'][index]
                                        }}
                                    />
                                    <button onClick={() => submitVote(candidate.shirt.id)}>VOTE</button>
                                </div>
                                {index === array.length - 2 &&
                                    <p>VS</p>
                                }
                            </>
                        ))}
                    </div>
                )}
        </>
    )
}
function Results() {
    return <p>results</p>
}





function Audience() {
    const [gameData, setGameData] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/all`, {
        parser: (res => {
            return {
                id: res.sessionId,
                round: res.round,
                phase: res.phase,
                responses: res.responses,
                limit: res.limit,
                votes: res.audienceVotes,
            }
        })
    })

    useValidate({
        spectator: localStorage.getItem('spectatorUUID'),
        session: localStorage.getItem('sessionUUID'),
        onInvalid: (() => {
            if (gameData === null) return
            if (!DEBUG_MODE) {
                localStorage.removeItem('sessionUUID')
                localStorage.removeItem('playerUUID')
                localStorage.removeItem('spectatorUUID')
            } else {
                console.log("DEBUG MODE: remove sessionUUID")
                console.log("DEBUG MODE: remove playerUUID")
                console.log("DEBUG MODE: remove spectatorUUID")
            }
        }),
        dependencies: [gameData]
    })
    
    if (gameData === null) return 'loading...'
    return (
        <div>
            <p>SPECTATING</p>
            <p>ROUND {gameData.round}</p>
            {(() => {
                if (gameData.round === 0) return <Waiting text={"Waiting for game to begin"} />
                if (gameData.round === 4) return <Results />
                if (gameData.phase === 4) return <AudienceVoting key={gameData.round} votes={gameData.votes || {}} round={gameData.round}/>
            })()}
        </div>
    )
}

function AudienceVoting({votes, round}) {
    const [hasVoted, setHasVoted] = useState(false)
    const [candidates, setCandidates] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/shirts?status=${round !== 3 ? 'unused' : 'winner'}&deep=true&amount=2`, {
        parser: (res => {
            return res.shirts
        }),
        onFailure: (err => console.log(err)),
        initial: []
    })

    const submitVote = (shirt) => {
        fetch(`${import.meta.env.VITE_SERVER_URL}/vote`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                group: 'audienceVotes',
                id: localStorage.getItem('spectatorUUID'),
                shirt: shirt
            })
        })
            .then(response => response.json())
            .then(res => {
                // console.log(res.message)
            })
            .catch(err => console.log(err))
    }

    useEffect(() => {
        setHasVoted(Object.keys(votes).includes(localStorage.getItem('spectatorUUID')))
    }, [votes])

    if (Object.keys(candidates).length < 2) return "loading..."
    return (
        <>
            {hasVoted ? 
                (<p>waiting for next vote</p>)
                : 
                (
                    <div className="voting flex">
                        {candidates.map((candidate, index, array) => (
                            <>
                                <div>
                                    <Shirt design={candidate.design} slogan={candidate.slogan} animated={true}/>
                                    <button onClick={() => submitVote(candidate.shirt.id)}>VOTE</button>
                                </div>
                                {index === array.length - 2 &&
                                    <p>VS</p>
                                }
                            </>
                        ))}
                    </div>
                )}
        </>
    )
}
