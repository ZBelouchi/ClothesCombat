import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useContinuousFetch from '../hooks/useContinuousFetch'
// import useWindowDimensions from '../hooks/useWindowDimensions'
import useObject from '../hooks/useObject'
import useTimer from '../hooks/useTImer'
import useValidate from '../hooks/useValidate'
import Shirt from './Shirt'
import IMAGES from '../assets/images'
import useToggle from '../hooks/useToggle'
import Loading from './Loading'
const DEBUG_MODE = Number(import.meta.env.VITE_DEBUG_MODE)
/*
    Lobby
    Round (root)
        TODO: fix next patch request being made upon refresh from restarting server while session is mid game
        CLEAN: make better timestamps
            (FLUKE?)BUG: drawing phase in round 2 doesn't end automatically, but in round 1 it ends fine
        `BUG: fix page refresh in voting sometimes skips voting phase (not consistently, but it happens sometimes when I change code and save to trigger refresh, believe it's anything that would result in a state or content change or something)
        `BUG: fix page refresh on results of a vote phase causing a softlock where it gets stuck loading and the game can't continue
        CLEAN: utilize new getPlayerName method more, and maybe make more similar methods to avoid all the hassle of getting adjacent data
        TODO: add fallback to timer for if something goes wrong, it will just stay stuck
        TODO: add on timer end, submitting whatever the users have entered so far (WIP drawing, slogans, etc.)
*/

export default function Host() {
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
                spectators: res.spectators,
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
        session: !DEBUG_MODE ? localStorage.getItem('sessionUUID') : localStorage.getItem('DEBUG-SESSION'),
        onInvalid: () => {
            console.log("HERE");
            if (!DEBUG_MODE) {
                localStorage.setItem('sessionUUID', gameData.sessionId)
            } else {
                console.log("DEBUG MODE: overwrite sessionUUID");
            }
            nav('..')
        },
        doValidation: gameData?.inProgress,
        dependencies: [gameData]
    })
    const {object: formData, update: updateFormData} = useObject({
        rounds: 2,
        time: 60,
        noTimer: false,
        anyColor: false,
        players: 8,
        mode: 'koh'
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

    return (
        <main className="host">
            {(() => {
                // Loading
                if (gameData === null) return <Loading/>
                // console.log(gameData);
                // Lobby
                if (!gameData.inProgress) return (
                    <div className='lobby'>
                        <section className="lobby__section lobby__section--code">
                            <div className='start'>
                                <h1 className='start__header'>CLOTHES COMBAT</h1>
                                <p>Join the game on your device with code:</p>
                                {gameData.sessionId !== null ? (
                                    <>
                                        <p className='start__code'>{gameData.sessionId.slice(undefined, 4)}</p>
                                        <button
                                            className='start__btn btn'
                                            onClick={() => {
                                                    fetch(`${import.meta.env.VITE_SERVER_URL}/start`, {
                                                        method: 'PATCH',
                                                        headers: {'Content-Type': 'application/json'},
                                                        body: JSON.stringify(formData)
                                                    })
                                                    .then(response => response.json())
                                                    .then(res => {
                                                        localStorage.setItem('sessionUUID', res.sessionId)
                                                    })
                                                    .catch(err => console.log(err))
                                            }}
                                        >Start Game</button>
                                        {/* <form className='options'>
                                            <hr />
                                            <label>Number of Rounds (TBD)
                                                <input type="number" value={formData.rounds} onChange={e => updateFormData({rounds: e.target.value})} min={1} max={10}/> + final vote(s)
                                            </label><br />
                                            <label>Unlimited Colors (TBD)
                                                <input type="checkbox" value={formData.anyColor} onChange={e => updateFormData({anyColor: !formData.anyColor})}/>
                                            </label><br />
                                            <label>Infinite Time (TBD)
                                                <input type="checkbox" value={formData.noTimer} onChange={e => updateFormData({noTimer: !formData.noTimer})}/>
                                            </label><br />
                                            <label>Time per round (TBD)
                                                <input type="number" disabled={formData.noTimer} value={formData.time} onChange={e => updateFormData({time: e.target.value})} min={1} max={999}/>(seconds)
                                            </label><br />
                                            <label>Player Limit (TBD)
                                                <input type="number" value={formData.players} onChange={e => updateFormData({players: e.target.value})} min={3} max={16}/>
                                            </label><br />
                                            <label>Game Mode (TBD)
                                                <select onChange={e => updateFormData({mode: e.target.value})}>
                                                    <option value='koh'>King Of The Hill</option>
                                                    <option value='bracket'>Tournament</option>
                                                </select>
                                            </label><br />
                                        </form> */}
                                    </>
                                ) : (
                                    <>
                                        <p className='start__code'>???</p>
                                        <button 
                                            className='start__btn btn'
                                            onClick={() => {
                                                fetch(`${import.meta.env.VITE_SERVER_URL}/init-session`, {
                                                    method: 'POST'
                                                })
                                                    .then(response => response.json())
                                                    .then(res => {
                                                        console.log(res);
                                                        return localStorage.setItem('sessionUUID', res.sessionId)
                                                    })
                                            }}
                                        >Generate Session ID</button>
                                    </>
                                )}
                            </div>
                        </section>
                        <section className="lobby__section lobby__section--players">
                            <div className="lobby__section-container">
                                {gameData.sessionId !== null ? (
                                    <>
                                        {/* Audience */}
                                        <div className={`lobby__audience ${Object.keys(gameData.players).length !== 8 && 'lobby__audience--hidden'}`}>
                                            <p>Extra players can join the</p>
                                            <span>
                                                <b>AUDIENCE {gameData.spectators.length}</b>
                                            </span>
                                            <p>Your votes will influence the game</p>
                                        </div>
                                        {/* player list */}
                                        <ul className='players'>
                                            {(() => {
                                                let players = Object.values(gameData.players)
                                                let x = players.length
                                                players.length = 8
                                                players.fill(null, x, 8)
                                                return players.map((player, index) => (
                                                    <li className={`player player--${player !== null ? 'joined' : 'empty'}`} key={`player-${index}`}>
                                                        {player !== null && (
                                                            <div className='player__icon icon icon--small'>
                                                                    <img 
                                                                        src={IMAGES.icons[
                                                                            player?.icon !== null 
                                                                                ? player.icon
                                                                                : 16
                                                                            ]}
                                                                        alt="player icon"
                                                                    />
                                                            </div>
                                                        )}
                                                        <p className='player__name'>
                                                            {player !== null 
                                                                ? player.name
                                                                : "JOIN GAME"
                                                            }
                                                        </p>
                                                    </li>
                                                ))
                                            })()}
                                        </ul>
                                    </>
                                ) : (
                                    <p>generate code for players to join</p>
                                )}
                            </div>
                        </section>
                    </div>
                )
                // In Game
                return (
                    <div className="game">
                        <div className="game__container">
                            <div className="game__top">
                                <p className={`game__timer game__timer--${
                                    timer === 0
                                        ? 'finished'
                                        : isPaused
                                        ? 'paused'
                                        : 'ongoing'
                                }`}>{timer}</p>
                            </div>
                            <div className="game__bottom">
                                <div className="game__suggestions">
                                    <div className="game__audience audience">
                                        <img src={IMAGES.audience} alt="audience" />
                                        <div className="game__audience-bubble">
                                            <p>{'audience suggestion'}</p>
                                        </div>
                                    </div>
                                </div>
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
                        </div>
                    </div>
                )
                // unused leftover debug elements
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
                                nextPhaseCooldown.current
                                ? 'lightblue' 
                                : 'salmon'
                        }}>NEXT: {JSON.stringify(nextPhaseCooldown.current)}</p>
                        <button onClick={() => setTimer(0)}>TIMEOUT</button>
                    </div>
                )
            })()}
        </main>
    )
}

function AwaitingResponses({gameData}) {
    return (
        <div className="awaiting">
            <ul className="responses">
                {Object.values(gameData.players).map(player => (
                    <li 
                        className={`response ${(gameData.responses[player.id] >= gameData.limit) ? 'response--done' : ''}`}
                        key={`player-${player.id}`}
                    >
                        <img src={IMAGES.icons[player.icon]} alt="" className='icon--med'/>
                        <p className={`response__count ${(gameData.responses[player.id] >= gameData.limit) ? 'response__count--done' : ''}`}>{gameData.responses[player.id] || 0}</p>
                        
                    </li>
                ))}
            </ul>
        </div>
    )
    
    return (
        <>
            <h3>Players:</h3>
            <ul className='players'>
                
                {/* <button onClick={() => {
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
                }}>Remove</button> */}
            </ul>
        </>
    )
}
function Voting({gameData}) {
    const [results, setResults] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/count-votes`, {
        // check for Winner and Loser from server endpoint
        parser: (res => {
            if (res.success === false) return {winner: null, loser: null, champion: null, streakWinner: null}
            
            return {
                winner: res.winner, 
                loser: res.loser,
                champion: res.champion,
                streakWinner: res.streakWinner
            }
        }),
        initial: {winner: null, loser: null, champion: null, streakWinner: null},
        refreshDelay: 1000
    })
    const [candidates, setCandidates] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/shirts?status=${gameData.round !== 3 ? 'unused' : 'winner'}&deep=true&amount=2`, {
        parser: (res => {
            return res.shirts
        }),
        initial: [],
    })
    const shirtAnimations = [useRef(), useRef()]

    if (Object.values(candidates).length === 0 || results === undefined) {
        return <>LOADING</>
    }
    console.log(results);
    if (Object.values(candidates).length === 1) {
        // JSX 3 (end vote phase, campion and streak)
        return (
            <div className="voting">
                <div className="flex">
                    <div>
                        <h2>CHAMPION</h2>
                        <Shirt 
                            design={results.champion.design} 
                            slogan={results.champion.slogan} 
                            animated={true} 
                            ref={shirtAnimations[0]}
                            initialData={{
                                shirtRendered: true,
                                shirtVisible: true,
                                designVisible: true,
                                sloganVisible: true,
                                position: ['leftCenter', 'rightCenter']
                            }}
                        />
                    </div>
                    {(results.streakWinner.shirt.id !== results.champion.shirt.id) && 
                        <div>
                            <h2>HIGHEST STREAK</h2>
                            <Shirt 
                                design={results.streakWinner.design} 
                                slogan={results.streakWinner.slogan} 
                                animated={true} 
                                ref={shirtAnimations[0]}
                                initialData={{
                                    shirtRendered: true,
                                    shirtVisible: true,
                                    designVisible: true,
                                    sloganVisible: true,
                                    position: ['leftCenter', 'rightCenter']
                                }}
                            />
                        </div>
                    }
                </div>
                <button onClick={() => {
                    fetch(`${import.meta.env.VITE_SERVER_URL}/next`, {
                        method: 'PATCH',
                    })
                }}>NEXT ROUND</button>
            </div>
        )
        
    }
    if (results.winner !== null && results.loser !== null) {
        // JSX 2 (display vote results)
        return (
            <div className="voting">
                <p>JSX 2</p>
                <button onClick={() => {
                    fetch(`${import.meta.env.VITE_SERVER_URL}/next-vote`, {
                        method: 'PATCH'
                    })
                        .then(() => {
                            togglePauseResults(false)
                        })
                    }}>NEXT VOTE</button>
                <div className="flex">
                    {candidates.map((candidate, index, array) => (
                        <>
                            <div style={{backgroundColor: candidate.shirt.id === results.loser && 'red'}}>
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
                                <div> {/* Vote stats that appear after vote ends */}
                                    <h3>Created By</h3>
                                    <p>{gameData.getPlayerName(candidate.shirt.creatorId)}</p>
                                    <img src={IMAGES.icons[gameData.players[candidate.shirt.creatorId].icon]} alt="" className='icon--med'/>
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
                                </div>
                            </div>
                            {index === array.length - 2 &&
                                <p>VS</p>
                            }
                        </>
                    ))}
                </div>
                <p style={{backgroundColor: (results.winner !== null && results.loser !== null) && 'lime'}}>VOTES: {Object.keys(gameData.votes).length}</p>
            </div>
        )
    }

    // JSX 1 (voting in progress)
    return (
        <div className="voting">
            <p>JSX 1</p>
            <div className="flex">
                {candidates.map((candidate, index, array) => (
                    <>
                        <div>
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
                        </div>
                        {index === array.length - 2 &&
                            <p>VS</p>
                        }
                    </>
                ))}
            </div>
            <p style={{backgroundColor: (results.winner !== null && results.loser !== null) && 'lime'}}>VOTES: {Object.keys(gameData.votes).length}</p>
        </div>
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