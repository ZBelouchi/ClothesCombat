import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useContinuousFetch from '../hooks/useContinuousFetch'
import useValidate from '../hooks/useValidate'
import Shirt from './Shirt'

// Lobby
    //TODO: add kick player button
    //TODO: change clear players into full session reset
    //TODO: add check for existing session with option to continue to it or reset with new session
// Round (root)
    //TODO: fix next patch request being made upon refresh from restarting server while session is mid game
    //TODO: make better timestamps
    //BUG: drawing phase in round 2 doesn't end automatically, but in round 1 it ends fine
    //TODO: add actual timer
    //TODO: prevent timer from ending phase if there aren't enough items to use in a round
    //CLEAN: next effect is split into two effects to add a cooldown so it doesn't just blow through every round as soon as the conditions are met. need to clean up later

export default function Session() {
    const nav = useNavigate()
    const [isWaiting, setIsWaiting] = useState(true)
    const [timer, setTimer] = useState(60)
    const [gameData, setGameData] = useContinuousFetch('http://localhost:3000/all', {
        parser: (res => {
            // console.log(res);
            return {
                sessionId: res.sessionId,
                inProgress: res.inProgress,
                round: res.round,
                phase: res.phase,
                responses: res.responses,
                limit: res.limit,
                session: res.sessionId,
                players: res.players,
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
            localStorage.removeItem('sessionUUID')
            nav('..')
        },
        doValidation: gameData?.inProgress,
        dependencies: [gameData]
    })

    // if all players answered or time out, move to next phase/round
    useEffect(() => {
        if (gameData !== null && isWaiting) {
            // console.log("CHECK FOR NEXT:", timer === 0 || Object.keys(gameData.players).every(player => gameData.responses[player] >= gameData.limit));
            if (gameData.round !== 0 && (timer === 0 || Object.keys(gameData.players).every(player => gameData.responses[player] >= gameData.limit))) {
                // console.log("NEXT");
                setTimer(60)
                setIsWaiting(false)
            }
        }
    }, [timer, gameData])
    useEffect(() => {
        if (gameData !== null) {    //TEMP: this should keep next fetch from being called immediately for no reason, will make better later
            if (!isWaiting) {
                // move on to next round
                fetch('http://localhost:3000/next', {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'}
                })
                    .then(response => response.json())
                    .then(res => {
                        setIsWaiting(true)
                    })
            }
        }
    }, [isWaiting])

    // Loading
    if (gameData === null) return 'loading...'

    console.log(gameData.round, gameData.phase);
    // Lobby
    if (!gameData.inProgress) return (
        <div >
			<button onClick={() => {
				// TODO: add check for minimum players before starting
				fetch('http://localhost:3000/start', {
					method: 'PATCH',
					headers: {'Content-Type': 'application/json'}
				})
				.then(response => response.json())
				.then(res => {
					console.log(res);
					localStorage.setItem('sessionUUID', res.sessionId)
				})
				.catch(err => console.log(err))
			}}>Start Game</button>

			{/* TODO: change this to a PUT request */}
			<button onClick={() => {
				fetch('http://localhost:3000/players', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					}
				})
			}}>Clear Players</button>
			<h2>Players:</h2>
			<ul className='players'>
				{gameData.players !== null && Object.entries(gameData.players).map(player => {
                    if (player.toString() === '{}') return 'loading players...'
                    return (
                        <li className='player' key={`player-${player[0]}`}>
                            <h3>{player[1].name}</h3>
                            <p>{player[1].icon}</p>
                            <p>{player[1].phrase}</p>
                        </li>
                    )
                })}
			</ul>
		</div>
    )
    // In Game
    return (
        <div>
            <p>GAME SESSION: {gameData.sessionId}</p>
            <p>ROUND {gameData.round}</p>
            <p>waiting: {(timer === 0 || Object.keys(gameData.players).every(player => gameData.responses[player] >= gameData.limit)).toString()}</p>
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
            <p>TIME: {timer}</p>
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
            <ul>
                {Object.entries(gameData.players).map(player => (
                    <li 
                        style={{backgroundColor: (gameData.responses[player[0]] >= gameData.limit) && 'lime'}} 
                        key={`player-${player[0]}`}
                    >
                        {player[0]}<br />
                        {player[1].name} {gameData.responses[player[0]] || 0}/{gameData.limit}
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
    const [candidates, setCandidates] = useContinuousFetch(`http://localhost:3000/shirts?status=${gameData.round !== 3 ? 'unused' : 'winner'}&deep=true&amount=2`, {
        parser: (res => {
            return res.shirts
        }),
        initial: [],
        isPaused: isDone
    })

    const countVotes = (votes, audienceVotes, shirt1, shirt2) => {
        //TODO: maybe abstract this to a server-side route
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
        //TODO: maybe make more cinematic in case of such a tie, like a big coin flip or something
        return [
            {winner: shirt2,loser: shirt1}, 
            {winner: shirt1,loser: shirt2}
        ][Math.floor(Math.random() * 2)]
    }
    const endVote = () => {
        // add audience votes to shirts
        fetch(`http://localhost:3000/shirt/${winner}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                audience: Object.values(gameData.audienceVotes).filter((vote) => vote === winner).length
            })
        })
            .then(
                fetch(`http://localhost:3000/shirt/${loser}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        audience: Object.values(gameData.audienceVotes).filter((vote) => vote === loser).length
                    })
                })
            )


        // discard loser
        fetch(`http://localhost:3000/shirt/${loser}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                status: 'discarded'
            })
        })
            .then(response => response.json())
            .then(res => {})

        // add win to surviving shirt
        fetch(`http://localhost:3000/shirt/${winner}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                wins: '++'
            })
        })
            .then(response => response.json())
            .then(res => {})

        fetch('http://localhost:3000/clear/votes', {
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
        fetch('http://localhost:3000/next', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'}
        })
            .then(response => response.json())
            .then(res => {
            })
    }

    useEffect(() => {   
        // if everyone has voted OR timeout
        //TODO: prevent NaN from being passed with no votes (shouldn't be a fatal error, but not clean)
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
    
    if (Object.keys(candidates).length === 0) return "loading..."
    if (isDone || Object.keys(candidates).length === 1) {
        if (!isDone) {    
            // update winning shirt status to winner
            fetch(`http://localhost:3000/shirt/${winner}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    status: 'winner'
                })
            })
    
            // if NOT final round
            if (gameData.round !== 3) {
                
                // get streak winner id 
                fetch(`http://localhost:3000/streak-winner?round=${gameData.round}`)
                    .then(response => response.json())
                    .then(streakWinner => {

                        // set streak winner status to winner
                        fetch(`http://localhost:3000/shirt/${streakWinner.id}`, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                status: 'winner'
                            })
                        })
                            .then(() => {

                                // add winner shirt (w/ elements) to candidates for display
                                fetch(`http://localhost:3000/shirt-elements/${streakWinner.id}`)
                                    .then(response => response.json())
                                    .then(streakElements => {
                                        // update end display
                                        //TODO: add check for if they're the same so display isn't duplicated
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
                        <Shirt design={endDisplay.champion.design} slogan={endDisplay.champion.slogan} animated={false}/>
                    </div>
                    {endDisplay?.streak && <div>
                        <h3>STREAK</h3>
                        <Shirt design={endDisplay.streak.design} slogan={endDisplay.streak.slogan} animated={false}/>
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
                            <Shirt design={candidate.design} slogan={candidate.slogan} animated={true}/>
                            {showVotes &&
                                <>
                                    <h3>Votes</h3>
                                    <ul>
                                        {Object.entries(gameData.votes)
                                            .filter(vote => vote[1] === candidate.shirt.id)
                                            .map(vote => (
                                                <li>{gameData.players[vote[0]].name}</li>
                                            )
                                        )}
                                    </ul>
                                    <h3>Audience Score</h3>
                                    <p>{(() => {
                                        // for% = (total# - against#) / total
                                        let total = Object.entries(gameData.audienceVotes).length
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
            <p>LOSER: {showVotes ? [candidates[0].shirt.id, candidates[1].shirt.id].indexOf(loser)+1 : 'none'}</p>
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

    const [results, setResults] = useContinuousFetch('http://localhost:3000/results', {
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
                            shirt: {
                                design: results.champion.shirt.design,
                                slogan: results.champion.shirt.slogan,
                            }
                        },
                        {title: 'Best Writer',
                            description: `Slogans used on ${results.writer.amount} shirts`,
                            player: results.writer.player
                        },
                        {title: 'Best Artist',
                            description: `Designs used on ${results.artist.amount} shirts`,
                            player: results.artist.player
                        },
                        {title: 'Most Prolific',
                            description: `Submitted the most designs and slogans, at ${results.prolific.amount}`,
                            player: results.prolific.player
                        },
                        {title: 'Most Ignored',
                            description: 'Most unused designs and slogans',
                            player: results.ignored
                        },
                        {title: 'Audience Favorite',
                            description: 'Most audience votes',
                            player: results.favorite.player,
                            shirt: {
                                design: results.favorite.shirt.design,
                                slogan: results.favorite.shirt.slogan
                            }
                        },
                        {title: 'Most Shirtalities',
                            description: 'Won over the most shirts',
                            player: results.shirtalities.player,
                            shirt: {
                                design: results.shirtalities.shirt.design,
                                slogan: results.shirtalities.shirt.slogan
                            }
                        },
                        {title: 'Fastest Artist',
                            description: `Finished a design in ${results.fastest.time} seconds`,
                            player: results.fastest.player
                        },
                    ].map(winner => winner.player !== null && (
                        <div className='winner'>
                            <h2>{winner.player}</h2>
                            <h3>{winner.title}</h3>
                            <p>{winner.description}</p>
                            {winner?.shirt && <Shirt design={winner.shirt.design} slogan={winner.shirt.slogan} animated={false} />}
                        </div>
                    ))
                }
            </div>
            <div className="credits">
                <h3>Made by</h3>
                <p>me {":)"}</p>
            </div>
            <div>
                <p>Play again with</p>
                <button>SAME PLAYERS</button>
                <p>or</p>
                <button>NEW GAME</button>
            </div>
        </>
    )
}