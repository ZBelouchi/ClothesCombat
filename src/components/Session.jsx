import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useContinuousFetch from '../hooks/useContinuousFetch'
// import useWindowDimensions from '../hooks/useWindowDimensions'
import useArray from '../hooks/useArray'
import useTimer from '../hooks/useTImer'
import useValidate from '../hooks/useValidate'
import Shirt from './Shirt'
import IMAGES from '../assets/images'
const DEBUG_MODE = Number(import.meta.env.VITE_DEBUG_MODE)
/*
    Lobby
        TODO: add kick player button
        TODO: change clear players into full session reset
        TODO: add check for existing session with option to continue to it or reset with new session
    Round (root)
        TODO: fix next patch request being made upon refresh from restarting server while session is mid game
        TODO: make better timestamps
        BUG: drawing phase in round 2 doesn't end automatically, but in round 1 it ends fine
        TODO: add actual timer
        TODO: prevent timer from ending phase if there aren't enough items to use in a round
        CLEAN: next effect is split into two effects to add a cooldown so it doesn't just blow through every round as soon as the conditions are met. need to clean up later
        TODO: fix page refresh in voting sometimes skips voting phase (not consistently, but it happens sometimes when I change code and save to trigger refresh, believe it's anything that would result in a state or content change or something)
        TODO: fix page refresh on results of a vote phase causing a softlock where it gets stuck loading and the game can't continue
        CLEAN: utilize new getPlayerName method more, and maybe make more similar methods to avoid all the hassle of getting adjacent data
        TODO: add check for minimum players before starting
        TODO: maybe abstract vote counting to a server-side route
        TODO: maybe make random tiebreaker more cinematic in case of such a tie, like a big coin flip or something
        TODO: in voting>(isDone||1candidate) add check for if they're the same so display isn't duplicated
        TODO: add fallback to timer for if something goes wrong, it will just stay stuck
        TODO: add on timer end, submitting whatever the users have entered so far (WIP drawing, slogans, etc.)
*/

export default function Session() {
    const nav = useNavigate()
    const nextPhaseCooldown = useRef(false)
    const {timer, timerMax, isPaused, setTimer, togglePause, resetTimer} = useTimer(60)
    //DEBUG pause timer on mount to prevent it messing things up in development
    useEffect(() => {
        if (!isPaused) {
            togglePause()
        }
    })
    const [gameData, setGameData] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/all`, {
        parser: (res => {
            return {
                sessionId: res.sessionId,
                inProgress: res.inProgress,
                icons: res.icons,
                round: res.round,
                phase: res.phase,
                responses: res.responses,
                limit: res.limit,
                session: res.sessionId,
                players: res.players,
                getPlayerName: function(playerId) {
                    return res.players[playerId].name
                },
                designs: res.designs,
                votes: res.votes,
                audienceVotes: res.audienceVotes,
                shirts: res.shirts
            }
        })
    })
    useValidate({
        session: localStorage.getItem('sessionUUID'),
        onInvalid: () => {
            if (!DEBUG_MODE) {
                localStorage.removeItem('sessionUUID')
            } else {
                console.log("DEBUG MODE: remove sessionUUID");
            }
            nav('..')
        },
        doValidation: gameData?.inProgress,
        dependencies: [gameData]
    })


    // Move on to next round if ready
    useEffect(() => {
        if (gameData !== null && !nextPhaseCooldown.current && gameData.inProgress) {
            // game data can be read AND cooldown isn't active AND game is in progress

            // responses are greater than 0
            const A = JSON.stringify(gameData.responses) !== '{}'
            // all required responses are in
            const B = Object.keys(gameData.players).every(player => gameData.responses[player] >= gameData.limit)
            // time has run out
            const C = (timer === 0)
            console.log(">0 responses", A);
            console.log("responses meet limit", B);
            console.log("time run out", C);
            console.log("will move on", A && B || C);
            if (A && B || C) {
                console.log("move on to next round NOW!");
                // set cooldown to prevent double requests (maybe clean up later but I think this is the only way)
                nextPhaseCooldown.current = true
                
                // reset + pause timer
                resetTimer()

                // move to next phase/round
                fetch(`${import.meta.env.VITE_SERVER_URL}/next`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'}
                })
                    .then(response => response.json())
                    .then(res => {
                        // start timer
                        togglePause()
                    })
                    .then(() => {
                        nextPhaseCooldown.current = false
                    })
            }
        }
    }, [gameData, timer])

    // Loading
    if (gameData === null) return 'loading...'

    // Lobby
    if (!gameData.inProgress) return (
        <div >
			<button onClick={() => {
				fetch(`${import.meta.env.VITE_SERVER_URL}/start`, {
					method: 'PATCH',
					headers: {'Content-Type': 'application/json'}
				})
				.then(response => response.json())
				.then(res => {
					localStorage.setItem('sessionUUID', res.sessionId)
				})
				.catch(err => console.log(err))
			}}>Start Game</button>
			<h2>Players:</h2>
			<ul className='players'>
                {(() => {
                    let players = Object.values(gameData.players)
                    let x = players.length
                    players.length = 8
                    players.fill(null, x, 8)
                    return players.map((player, index) => {
                        if (player === null) return <p className='player' key={`player-TEMP${index}`}>join game</p>
                        return (
                            <li className='player' key={`player-${player.id}`}>
                                <h3>{player.name}</h3>
                                <img src={IMAGES.icons[player.icon]} alt=""  className='icon--small'/>
                            </li>
                        )
                    })
                })()}
			</ul>
		</div>
    )
    // In Game
    return (
        <div>
            <p>GAME SESSION: {gameData.sessionId}</p>
            <button onClick={() => {
                if (confirm("WARNING: the current session will be ended and all data will be lost\nwould you still like to end the game?")) {
                    fetch(`${import.meta.env.VITE_SERVER_URL}/reset`, {
                        method: 'PUT',
                        body: {
                            keepPlayers: false
                        }
                    })
                        .then(res => res.json())
                        .then(res => {
                            console.log(res)
                        })
                }
            }}>END SESSION</button>
            <p>ROUND {gameData.round}</p>
            <p>PHASE {(() => {
                if (gameData.round === 4) {}
                switch(gameData.phase) {
                    case 1: return 'drawing'
                    case 2: return 'slogans'
                    case 3: return 'combinations'
                    case 4: return 'voting'
                }
            })()}</p>
            <p>LIMIT {gameData.limit}</p>
            <p style={{
                backgroundColor: 
                    timer === 0 
                    ? 'red' 
                    : isPaused 
                    ? 'lightblue'
                    : 'lime'
            }}>TIME: {timer} / {timerMax}</p>
            <p style={{
                backgroundColor: 
                    nextPhaseCooldown.current
                    ? 'lightblue' 
                    : 'salmon'
            }}>NEXT: {JSON.stringify(nextPhaseCooldown.current)}</p>
            <button onClick={() => setTimer(0)}>TIMEOUT</button>
            {(() => {
                if (gameData.round === 4)return <Results />
                switch (gameData.phase) {
                    case 1: 
                    case 2: 
                    case 3: 
                        return <AwaitingResponses gameData={gameData}/>
                    case 4: 
                        return <Voting key={gameData.round} gameData={gameData}/>
                }
            })()}
        </div>
    )
}

function AwaitingResponses({gameData}) {
    return (
        <>
            <h3>Players:</h3>
            <ul className='players'>
                {Object.values(gameData.players).map(player => (
                    <li 
                        className='player'
                        style={{backgroundColor: (gameData.responses[player.id] >= gameData.limit) && 'lime'}} 
                        key={`player-${player.id}`}
                    >
                        
                        <p>{gameData.responses[player.id] || 0}</p>
                        <img src={IMAGES.icons[player.icon]} alt="" className='icon--small'/>
                        <h3>{player.name} </h3>
                        <button onClick={() => {
                            fetch(`${import.meta.env.VITE_SERVER_URL}/player/${player.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                                .then(res => res.json())
                                .then(res => {
                                    console.log(res)
                                })
                        }}>Remove</button>
                    </li>
                ))}
            </ul>
        </>
    )
}
function Voting({gameData}) {
    const [loser, setLoser] = useState('')
    const [winner, setWinner] = useState('')
    const [showVotes, setShowVotes] = useState(false)
    const [isDone, setIsDone] = useState(false)
    const [endDisplay, setEndDisplay] = useState({})
    const [candidates, setCandidates] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/shirts?status=${gameData.round !== 3 ? 'unused' : 'winner'}&deep=true&amount=2`, {
        parser: (res => {
            // console.log("fetched", res);
            return res.shirts
        }),
        initial: [],
        isPaused: isDone
    })

    const shirtAnimations = [useRef(), useRef()]

    const countVotes = (votes, audienceVotes, shirt1, shirt2) => {
        // 1: count player votes
        let tally = {
            [shirt1]: 0,
            [shirt2]: 0
        }
        for (let vote of Object.values(votes)) {
            tally[vote]++
        }
        if (tally[shirt1] < tally[shirt2]) {return {
            winner: shirt2,
            loser: shirt1
        }}
        else if (tally[shirt1] > tally[shirt2]) {return {
            winner: shirt1,
            loser: shirt2
        }}

        // 2: count audience votes
        tally = {
            [shirt1]: 0,
            [shirt2]: 0
        }
        for (let vote of Object.values(audienceVotes)) {
            tally[vote]++
        }
        if (tally[shirt1] < tally[shirt2]) {return {
            winner: shirt2,
            loser: shirt1
        }}
        else if (tally[shirt1] > tally[shirt2]) {return {
            winner: shirt1,
            loser: shirt2
        }}

        // 3: slower submission
        if (gameData.shirts[shirt1].timestamp > gameData.shirts[shirt2].timestamp) {return {
            winner: shirt2,
            loser: shirt1
        }}
        else if (gameData.shirts[shirt1].timestamp < gameData.shirts[shirt2].timestamp) {return {
            winner: shirt1,
            loser: shirt2
        }}

        // 4: random (just in case)
        return [
            {winner: shirt2,loser: shirt1}, 
            {winner: shirt1,loser: shirt2}
        ][Math.floor(Math.random() * 2)]
    }
    const endVote = () => {
        console.log("ENDING VOTE");
        // add audience votes to shirts
        fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${winner}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                audience: Object.values(gameData.audienceVotes).filter((vote) => vote === winner).length
            })
        })
            .then(
                fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${loser}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        audience: Object.values(gameData.audienceVotes).filter((vote) => vote === loser).length
                    })
                })
            )


        // discard loser
        fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${loser}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                status: 'discarded'
            })
        })
            .then(response => response.json())
            .then(res => {})

        // add win to surviving shirt
        fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${winner}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                wins: '++'
            })
        })
            .then(response => response.json())
            .then(res => {})

        fetch(`${import.meta.env.VITE_SERVER_URL}/clear/votes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
        setShowVotes(false)
    }
    const endPhase = () => {
        // move on to next round, back to drawing phase
        fetch(`${import.meta.env.VITE_SERVER_URL}/next`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'}
        })
            .then(response => response.json())
            .then(res => {
            })
    }

    useEffect(() => {   
        // if everyone has voted OR timeout
        if (candidates.length !== 0 && Object.keys(gameData.votes).length === Object.keys(gameData.players).length || false) { //TODO: add timer check here
            let {winner, loser} = countVotes(
                gameData.votes, 
                gameData.audienceVotes, 
                candidates[0].shirt.id, 
                candidates[1].shirt.id
            )
            setWinner(winner)
            setLoser(loser)
            setShowVotes(true)
        }
    }, [gameData])
    
    if (Object.keys(candidates).length === 0) return (
        <>
            <p>loading</p>
            <button onClick={() => endPhase()}>IN CASE OF SOFTLOCK</button>
        </>
    )
    
    if (isDone || Object.keys(candidates).length === 1) {
        if (!isDone) {    
            // update winning shirt status to winner
            fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${winner}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    status: 'winner'
                })
            })
    
            // if NOT final round
            if (gameData.round !== 3) {
                
                // get streak winner id 
                fetch(`${import.meta.env.VITE_SERVER_URL}/streak-winner?round=${gameData.round}`)
                    .then(response => response.json())
                    .then(streakWinner => {

                        // set streak winner status to winner
                        fetch(`${import.meta.env.VITE_SERVER_URL}/shirt/${streakWinner.id}`, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                status: 'winner'
                            })
                        })
                            .then(() => {

                                // add winner shirt (w/ elements) to candidates for display
                                fetch(`${import.meta.env.VITE_SERVER_URL}/shirt-elements/${streakWinner.id}`)
                                    .then(response => response.json())
                                    .then(streakElements => {
                                        // update end display
                                        setEndDisplay({
                                            champion: candidates[0],
                                            streak: streakElements.elements 
                                        })
                                    })
                            })
                    })
            } else {
                setEndDisplay({
                    champion: candidates[0]
                })
            }
            setIsDone(true)
        }

        if (Object.keys(endDisplay).length === 0) return 'loading display...'
        return (
            <>
                <div className="flex">
                    <div>
                        <h3>CHAMPION</h3>
                        <Shirt 
                            design={endDisplay.champion.design} 
                            slogan={endDisplay.champion.slogan} 
                            animated={false} 
                            // ref={shirtAnimations[index]}
                            initialData={{
                                shirtRendered: true,
                                shirtVisible: true,
                                designVisible: true,
                                sloganVisible: true,
                                position: 'leftCenter'
                            }}
                        />
                    </div>
                    {endDisplay?.streak && <div>
                        <h3>STREAK</h3>
                        <Shirt 
                            design={endDisplay.streak.design} 
                            slogan={endDisplay.streak.slogan} 
                            animated={false} 
                            // ref={shirtAnimations[index]}
                            initialData={{
                                shirtRendered: true,
                                shirtVisible: true,
                                designVisible: true,
                                sloganVisible: true,
                                position: 'rightCenter'
                            }}
                        />
                    </div>}
                </div>
                <button onClick={() => endPhase()}>to Next Round</button>
            </>
        )
        
    }
    return (
        <>
            <div className="voting flex">
                {candidates.map((candidate, index, array) => (
                    <>
                        <div style={{backgroundColor: candidate.shirt.id === loser && 'red'}}>
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
                            {/* <button onClick={() => shirtAnimations[index].current.toggleRendered()}>render shirt</button>
                            <button onClick={() => shirtAnimations[index].current.toggleVisible()}>toggle shirt visibility</button>
                            <button onClick={() => shirtAnimations[index].current.parts.design()}>reveal art</button>
                            <button onClick={() => shirtAnimations[index].current.parts.text()}>reveal text</button>
                            <button onClick={() => shirtAnimations[index].current.movement.move('center')}>center</button>
                            <button onClick={() => shirtAnimations[index].current.movement.move({x:300, y:300})}>move 300-300</button>
                            <button onClick={() => shirtAnimations[index].current.goToCorner()}>set position 0-0</button>
                            <button onClick={() => shirtAnimations[index].current.logPosition()}>log position</button>
                            <button onClick={() => shirtAnimations[index].current.movement.enter('from-top', {destination: {x:200, y:200}})}>enter from top</button>
                            <button onClick={() => shirtAnimations[index].current.movement.enter('from-bottom', {destination: {x:200, y:200}})}>enter from bottom</button>
                            <button onClick={() => shirtAnimations[index].current.movement.enter('from-left', {destination: {x:200, y:200}})}>enter from left</button>
                            <button onClick={() => shirtAnimations[index].current.movement.enter('from-right', {destination: {x:200, y:200}})}>enter from right</button>
                            <button onClick={() => shirtAnimations[index].current.movement.exit('to-top')}>exit to top</button>
                            <button onClick={() => shirtAnimations[index].current.movement.exit('to-bottom')}>exit to bottom</button>
                            <button onClick={() => shirtAnimations[index].current.movement.exit('to-left')}>exit to left</button>
                            <button onClick={() => shirtAnimations[index].current.movement.exit('to-right')}>exit to right</button> */}
                            {showVotes &&
                                <>
                                    <h3>Created By</h3>
                                    <p>{gameData.getPlayerName(candidate.shirt.creatorId)}</p>
                                    <img src={IMAGES.icons[gameData.players[candidate.shirt.creatorId].icon]} alt="" />
                                    <h3>Votes</h3>
                                    <ul>
                                        {Object.entries(gameData.votes)
                                            .filter(vote => vote[1] === candidate.shirt.id)
                                            .map(vote => (
                                                <li>{gameData.getPlayerName(vote[0])}</li>
                                            )
                                        )}
                                    </ul>
                                    <h3>Audience Score</h3>
                                    <p>{(() => {
                                        let total = Object.entries(gameData.audienceVotes).length
                                        if (total === 0) return 0
                                        let against = Object.entries(gameData.audienceVotes).filter(([v, c]) => c !== candidate.shirt.id).length
                                        let support = ((total - against) / total) * 100
                                        return support
                                    })()
                                    }%</p>
                                    <h3>Time</h3>
                                    <p>{candidate.shirt.timestamp} sec</p>
                                </>
                            }
                        </div>
                        {index === array.length - 2 &&
                            <p>VS</p>
                        }
                    </>
                ))}
            </div>
            {/* <p>LOSER: {showVotes ? [candidates[0].shirt.id, candidates[1].shirt.id].indexOf(loser)+1 : 'none'}</p> */}
            <p style={{backgroundColor: showVotes && 'lime'}}>VOTES: {Object.keys(gameData.votes).length}</p>
            {showVotes && <button onClick={() => endVote()}>Proceed</button>}
        </>
    )
}

function Results() {
    // winners of each category*
    // victory blurb with champ's icon and name mentioned
        
    // credits?
    // play again (same players or new players)

    const [results, setResults] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/results`, {
        parser: (res => {
            return {
                champion: res.champion,
                writer: res.writer,
                artist: res.artist,
                fastest: res.fastest,
                favorite: res.favorite,
                prolific: res.prolific,
                shirtalities: res.shirtalities,
                ignored: res.ignored
            }
        }),
        refreshDelay: 5000
    })

    if (results === null) return 'loading results...'
    return (
        <>
            <div className="winners row">
                {
                    [
                        {title: "Champion",
                            description: 'winner of the game',
                            player: results.champion.player,
                            icon: results.champion.icon,
                            shirt: {
                                design: results.champion.shirt.design,
                                slogan: results.champion.shirt.slogan,
                            }
                        },
                        {title: 'Best Writer',
                            description: `Slogans used on ${results.writer.amount} shirts`,
                            player: results.writer.player,
                            icon: results.writer.icon,
                        },
                        {title: 'Best Artist',
                            description: `Designs used on ${results.artist.amount} shirts`,
                            player: results.artist.player,
                            icon: results.artist.icon,
                        },
                        {title: 'Most Prolific',
                            description: `Submitted the most designs and slogans, at ${results.prolific.amount}`,
                            player: results.prolific.player,
                            icon: results.prolific.icon,
                        },
                        {title: 'Most Ignored',
                            description: 'Most unused designs and slogans',
                            player: results.ignored,
                            icon: results.ignored.icon,
                        },
                        {title: 'Audience Favorite',
                            description: 'Most audience votes',
                            player: results.favorite.player,
                            icon: results.favorite.icon,
                            shirt: {
                                design: results.favorite.shirt.design,
                                slogan: results.favorite.shirt.slogan
                            }
                        },
                        {title: 'Most Shirtalities',
                            description: 'Won over the most shirts',
                            player: results.shirtalities.player,
                            icon: results.shirtalities.icon,
                            shirt: {
                                design: results.shirtalities.shirt.design,
                                slogan: results.shirtalities.shirt.slogan
                            }
                        },
                        {title: 'Fastest Artist',
                            description: `Finished a design in ${results.fastest.time} seconds`,
                            player: results.fastest.player,
                            icon: results.fastest.icon,
                        },
                    ].map(winner => winner.player !== null && (
                        <div className='winner'>
                            <h2>{winner.player}</h2>
                            <h3>{winner.title}</h3>
                            <p>{winner.description}</p>
                            {winner?.shirt && (
                                <Shirt 
                                    design={winner.shirt.design} 
                                    slogan={winner.shirt.slogan} 
                                    animated={false} 
                                    // ref={shirtAnimations[index]}
                                    initialData={{
                                        shirtRendered: true,
                                        shirtVisible: true,
                                        designVisible: true,
                                        sloganVisible: true,
                                        position: 'inline'
                                    }}
                                />
                            )}
                        </div>
                    ))
                }
            </div>
            <div className="credits">
                <h3>Made by</h3>
                <p>me {":)"}</p>
            </div>
            <div>
                {/* NOTE: add option to carry over unused items from previous round into next */}
                <p>Play again with</p>
                <button onClick={() => {
                    fetch(`${import.meta.env.VITE_SERVER_URL}/reset`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            keepPlayers: true
                        })
                    })
                        .then(res => res.json())
                        .then(res => {
                            console.log(res)
                        })
                }}>SAME PLAYERS</button>
                <p>or</p>
                <button onClick={() => {
                    fetch(`${import.meta.env.VITE_SERVER_URL}/reset`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            keepPlayers: false
                        })
                    })
                        .then(res => res.json())
                        .then(res => {
                            console.log(res)
                        })
                }}>NEW GAME</button>
            </div>
        </>
    )
}