import React, { useRef } from 'react'
import useContinuousFetch from '../hooks/useContinuousFetch'

import Collapse from './Collpase'
import IMAGES from '../assets/images'
import ShirtComp, {Design as DesignComp} from './Shirt'

function Shirt({design, slogan, animated, size=200}) {
    const ref = useRef()

    return (
        <div>
            <ShirtComp 
                design={design} 
                slogan={slogan} 
                animated={animated}
                size={size}
                ref={ref}
                initialData={{
                    shirtRendered: true,
                    shirtVisible: true,
                    designVisible: true,
                    sloganVisible: true,
                    position: {x:0, y:0}
                }}
            />
        </div>
    )
}
function Design({design, animated, size=200}) {
    const ref = useRef()

    return (
        <div style={{
            backgroundColor: design.backgroundColor,
            width: size,
            height: size,
            display: 'inline-block'
        }}>
            <DesignComp 
                frames={design.frames}
                animated={animated}
                loop={false}
                width={size}
            />
        </div>
    )
}

//TODO: make component to visually represent session data (better than just getting the JSON from the fetch url does)
export default function Server() {
    const [data, setData] = useContinuousFetch(`${import.meta.env.VITE_SERVER_URL}/all`, {
        parser: res => {
            const deepProp = (group, item, prop) => {
                return res[group][item][prop]
            }
            const deep = (group, item) => {
                return res[group][item]
            }
            const votesFor = (shirt, group) => {
                if (group === 'audience') {
                    let total = Object.values(res.audienceVotes).length
                    if (total === 0) return [0, 0, {}]
                    let supporting = Object.entries(res.audienceVotes).filter(([v, c]) => c === shirt).map(([v, c]) => v)
                    let amt = supporting.length
                    let perc = Math.round((amt / total) * 100)
                    return [amt, perc, supporting]
                }
                let total = Object.values(res.votes).length
                if (total === 0) return [0, 0, {}]
                let supporting = Object.entries(res.votes).filter(([v, c]) => c === shirt).map(([v, c]) => v)
                let amt = supporting.length
                let perc = Math.round((amt / total) * 100)
                return [amt, perc, supporting]
            }

            return {
                ...res,
                deep: deep,
                deepProp: deepProp,
                playerName: ((player) => deepProp('players', player, 'name')),
                votesFor
            }
        }
    })
    
    if (!data) return 'loading'
    return (
        <>
            <Collapse title={<h2>session stuff</h2>} collapsed={true}>
                <p><b>Session ID: </b>{data.sessionId}</p>
                <p><b>Game In Progress: </b>{data.inProgress.toString()}</p>
                <p><b>Round: </b>{data.round}</p>
                <p><b>Phase: </b>{data.phase}</p>
                <p><b>Phase Timestamp: </b>{new Date(data.phaseTimestamp).toISOString()}</p>
            </Collapse>
            <Collapse title={<h2>options</h2>} collapsed={true}>
                <p><b>Rounds: </b>{data.options.rounds}</p>
                <p><b>Time: </b>{data.options.noTimer ? 'infinite' : data.options.time}</p>
                <p><b>Unlocked Colors: </b>{JSON.stringify(data.options.anyColor)}</p>
                <p><b>Player Limit: </b>{data.options.players}</p>
                <p><b>Mode: </b>{(() => {
                    switch (data.options.mode) {
                        case 'koh': return 'King of the Hill'
                        case 'bracket': return "Tournament Bracket"
                    }
                })()}</p>
            </Collapse>
            <Collapse title={<h2>responses</h2>} collapsed={true}> 
                <p><b>Response Limit: </b>{data.limit}</p>
                {Object.entries(data.responses).map(([k, v]) => <p><b>{data.playerName(k)}: </b>{v} {v >= data.limit && '(DONE)'}</p>)}
            </Collapse>
            <Collapse title={<h2>icons</h2>} collapsed={true}>
                <div className="flex" style={{flexWrap: 'wrap'}}>
                    {data.icons.map((user, index) => (
                        <p  style={{minWidth: '100px', opacity: user !== null ? 1 : 0.2}}>
                            <img src={IMAGES.icons[index]} className='icon--med'/>
                            <p>{index}: {user !== null ? data.playerName(user) : 'null'}</p>
                        </p>
                    ))}
                </div>
            </Collapse>
            <Collapse title={<h2>players</h2>} collapsed={true}>
                <div className="flex">
                    {Object.values(data.players).map((player) => (
                        <div className="player">
                            <p>{player.name}</p>
                            <p>{player.id}</p>
                            <p>"{player.phrase}"</p>
                            <img src={IMAGES.icons[player.icon]} alt="" className='icon--med' />
                            <div>
                                <h3>Designs:</h3>
                                {
                                    Object.values(data.designs)
                                    .filter(design => design.creatorId === player.id)
                                    .map(design => <Design design={design} animated={true} size={125}/>)
                                }
                            </div>
                            <div>
                                <h3>Slogans:</h3>
                                {
                                    Object.values(data.slogans)
                                    .filter(slogan => slogan.creatorId === player.id)
                                    .map(slogan => <p>{slogan.text}</p>)
                                }
                            </div>
                            <div>
                                <h3>Shirts:</h3>
                                {
                                    Object.values(data.shirts)
                                    .filter(shirt => shirt.creatorId === player.id)
                                    .map(shirt => <Shirt design={data.deep('designs', shirt.designId)} slogan={data.deep('slogans', shirt.sloganId)} animated={true} size={150}/>)
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </Collapse>
            <Collapse title={<h2>spectators</h2>} collapsed={true}>
                {data.spectators.map(spectator => <p>{spectator}</p>)}
            </Collapse>
            <Collapse title={<h2>designs</h2>} collapsed={true}>
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                        Object.values(data.designs).map(design => (
                            <div className='player'>
                                <Design design={design} animated={true}/>
                                <p>{design.id}</p>
                                <p><b>Creator: </b>{data.playerName(design.creatorId)}</p>
                                <p style={{
                                    backgroundColor: design.recipient === null
                                    ? 'none'
                                    : design.recipient === 'used'
                                    ? 'red'
                                    : 'yellow'
                                }}>
                                    <b>Recipient / Status: </b>
                                    {
                                    design.recipient === null
                                    ? 'unused'
                                    : design.recipient === 'used'
                                    ? <Shirt design={design} slogan={data.deep('slogans', Object.values(data.shirts).find(shirt => shirt.designId === design.id).sloganId)} animated={false} size={150}/>
                                    : data.playerName(design.recipient) 
                                    }
                                </p>
                                <p><b>Frames (amt.): </b>{design.frames.length}</p>
                                <p><b>Background Color: </b>{design.backgroundColor}</p>
                                <p><b>Timestamp: </b>{design.timestamp}</p>
                            </div>
                        ))
                    }
                </div>
            </Collapse>
            <Collapse title={<h2>slogans</h2>} collapsed={true}>
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                        Object.values(data.slogans).map(slogan => (
                            <div className='player'>
                                <p style={{
                                    fontFamily: 'impact',
                                    fontSize: 30,
                                }}>{slogan.text}</p>
                                <p>{slogan.id}</p>
                                <p><b>Creator: </b>{data.playerName(slogan.creatorId)}</p>
                                <p style={{
                                    backgroundColor: slogan.recipient === null
                                    ? 'none'
                                    : slogan.recipient === 'used'
                                    ? 'red'
                                    : 'yellow'
                                }}><b>Recipient / Status: </b>{
                                    slogan.recipient === null
                                    ? 'unused'
                                    : slogan.recipient === 'used'
                                    ? <Shirt 
                                        design={data.deep('designs', Object.values(data.shirts).find(shirt => shirt.sloganId === slogan.id).designId)} 
                                        slogan={slogan} 
                                        animated={false}
                                        size={150}
                                    />
                                    : data.playerName(slogan.recipient) 

                                }</p>
                            </div>
                        ))
                    }
                </div>
            </Collapse>
            <Collapse title={<h2>shirts</h2>} collapsed={true}>
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                        Object.values(data.shirts).map(shirt => (
                            <div className='player'>
                                <Shirt design={data.deep('designs', shirt.designId)} slogan={data.deep('slogans', shirt.sloganId)} animate={true}/>
                                <p>{shirt.id}</p>
                                <p><b>Creator: </b>{data.playerName(shirt.creatorId)}</p>
                                <p><b>Artist: </b>{data.playerName(data.deepProp('designs', shirt.designId, 'creatorId'))}</p>
                                <p><b>Author: </b>{data.playerName(data.deepProp('slogans', shirt.sloganId, 'creatorId'))}</p>
                                <p><b>Round: </b>{shirt.round}</p>
                                <p style={{
                                    backgroundColor: shirt.status === 'discarded'
                                    ? 'red'
                                    : shirt.status === 'winner'
                                    ? 'lime'
                                    : 'none'
                                }}><b>Status: </b>{shirt.status}</p>
                                <p><b>Wins: </b>{shirt.wins}</p>
                                <p><b>Audience Votes: </b>{shirt.audienceVotes}</p>
                                <p><b>Timestamp: </b>{shirt.timestamp}</p>
                            </div>
                        ))
                    }
                </div>
            </Collapse>
            <Collapse title={<h2>votes</h2>} collapsed={true}>
                <h1>Tallies</h1>
                <div className="flex">
                    {Object.values(data.shirts)
                        .filter(shirt => shirt.status === (data.round !== 3 ? 'unused' : 'winner'))
                        .slice(0, 2)
                        .map(shirt => (
                            <div className="player">
                                <Shirt 
                                    design={data.deep('designs', shirt.designId)}
                                    slogan={data.deep('slogans', shirt.sloganId)}
                                    animated={false}
                                />
                                <p>{data.votesFor(shirt.id, 'players')[0]} Player Votes ({data.votesFor(shirt.id, 'players')[1]}%)</p>
                                <p>{data.votesFor(shirt.id, 'audience')[0]} Audience Votes ({data.votesFor(shirt.id, 'audience')[1]}%)</p>
                            </div>
                        ))
                    }
                </div>
                <h1>Player Votes</h1>
                <div className="flex">
                    {Object.entries(data.votes).map(([k, v]) => (
                        <div className='player'>
                            <h2>{data.playerName(k)}</h2>
                            <img src={IMAGES.icons[data.deepProp('players', k, 'icon')]} alt="" className='icon--med'/>
                            <p>voted for</p>
                            <Shirt 
                                design={data.deep('designs', data.deepProp('shirts', v, 'designId'))}
                                slogan={data.deep('slogans', data.deepProp('shirts', v, 'sloganId'))}
                                animated={false}
                                size={150}
                            />
                        </div>
                    ))}
                </div>
                <h1>Audience Votes</h1>
                {Object.entries(data.audienceVotes).map(([k, v]) => (
                        <div className='player'>
                            <h2>{k} voted for</h2>
                            <Shirt 
                                design={data.deep('designs', data.deepProp('shirts', v, 'designId'))}
                                slogan={data.deep('slogans', data.deepProp('shirts', v, 'sloganId'))}
                                animated={false}
                                size={150}
                            />
                        </div>
                    ))}
            </Collapse>
            <Collapse title={<h2>cache</h2>} collapsed={true}>
                <p><b>Winner: </b>{data.cache.winner}</p>
                <p><b>Loser: </b>{data.cache.loser}</p>
                <p><b>Champion: </b>{JSON.stringify(data.cache.champion)}</p>
                <p><b>Streak: </b>{JSON.stringify(data.cache.streakWinner)}</p>
            </Collapse>
            {/* <Collapse title={<h2>results</h2>} collapsed={true}>
            </Collapse> */}
            <Collapse title={<h2>Raw Data</h2>} collapsed={true}>
                <a href={`${import.meta.env.VITE_SERVER_URL}/all`}><h3>/all</h3></a>
                <pre>{JSON.stringify(data, null, 4)}</pre>
            </Collapse>
        </>
    )
}
//TODO: add endpoints to categories for direct access to data if needed
// like <a href={`${import.meta.env.VITE_SERVER_URL}/all`}><h3>/all</h3></a> for plain but also ones with inputs for parameters