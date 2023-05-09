import {v4 as uuid} from 'uuid'

let data = {
	sessionId: uuid(),            // session ID
	// sessionId: 'DEBUG-SESSION',
	inProgress: false,            // flag for if a game is currently being played
	round: 0,                     // round number (if 0 open to lobby, if 1+ check for uuid in storage and check server, if match rejoin game)
	phase: new Date().getTime(),  // phase of the round (0=waiting, 1=drawing, 2=slogans, 3=combinations, 4=voting)
	responses: {                  // uuids of players who have responded to a 1-per-player prompt, checked upon rejoin for opening to prompt or wait
		// uuid: 1      // uuids matched to number of responses
	},
	limit: 0,                     // response limit for phase (drawing=3, slogans=none*, combinations=1, voting=n*)
	phaseTimestamp: 0,            // time current phase began
	votes: {                      // votes cast by players
		// playeruuid: shirtuuid
	},
	audienceVotes: {              // votes cast by spectators
		// spectatoruuid: shirtuuid
	},
	players: {
		// 'idudidudiudiudid': {
		//     name: 'player1',
		//     icon: 'icon1',
		//     phrase: 'actually die',
		//     id: uuid
		// }
	},
	spectators: [
		// uuid, ...
	],
	designs: {
		// uuid: {
		//     backgroundColor: 'Blue',
		//     frames: ['dataURl', ...],
		//     recipient: null,             // id of player item is assigned to ('used' denotes item is no longer in circulation)
		//     creatorId: 0,
		//     timestamp: 0,
		//     id: uuid
		// }
	},
	slogans: {
		// uuid: {
		//     text: 'are you kidding me?',
		//     recipient: null              // id of player item is assigned to ('used' denotes item is no longer in circulation)
		//     creatorId: 0,
		//     id: uuid
		// }
	},
	shirts: {
		// uuid: {
		//     sloganId: uuid,
		//     designId: uuid,
		//     creatorId: uuid,
		//     round: 1             // round the shirt was created in
		//     status: 'unused',
		//     wins: 0,
		//     audienceVotes: 0,
		//     timestamp: 0,
		//     id: uuid
		// }
	}
}

// TESTING SAVES (enable debug player uuids in addPlayer() and debug session in data when using save states, and disable id resets in local storage on validation for both client and session)
const saves = {
	// 5-9-23 - before starting, has 1 player
	save1: {
		"success": true,
		"sessionId": "8701070f-dce0-4f17-a414-a0017732d30d",
		"inProgress": false,
		"round": 0,
		"phase": 1683645083437,
		"responses": { },
		"limit": 0,
		"phaseTimestamp": 0,
		"votes": { },
		"audienceVotes": { },
		"players": {
		  "0db5ed4a-9bfc-4150-9b83-b1351ca10f47": {
			"name": "saddasds",
			"icon": "icon_file_1",
			"phrase": "",
			"id": "0db5ed4a-9bfc-4150-9b83-b1351ca10f47"
		  }
		},
		"spectators": [ ],
		"designs": { },
		"slogans": { },
		"shirts": { }
	}
}
//SAVE OVERWRITE
// data = saves.save1

function saveOverwrite(skip = true) {
	// if (skip) return
	console.log("overwriting save data");

	// data.inProgress = true
	
	console.log("done overwriting save data\n");
}

function mostFrequent(arr) {
	const tally = {}
	for (let item of arr) {
		tally[item] = (tally[item] || 0) + 1
	}
	return (Object.entries(tally)
		.sort((a, b) => b[1] - a[1])
		.map(x => x[0]))[0]
}
function leastFrequent(arr) {
	const tally = {}
	for (let item of arr) {
		tally[item] = (tally[item] || 0) + 1
	}
	return (Object.entries(tally)
		.sort((a, b) => a[1] - b[1])
		.map(x => x[0]))[0]
}

function generateTimestamp(timestamp=new Date().getTime()) {
	let ts = timestamp - data.phaseTimestamp
	return ts / 1000
}

function setData(key, value) {
	data[key] = value
}
function getData(key) {
	return data[key]
}
function getAllData() {
	return data
}
function getSessionData() {
	return {
		id,
		round,
		phase,
		responses,
		limit,
		votes
	}
}

function addPlayer(player) {
	let id = uuid()
	//DEBUG
	// id = `DEBUG-${player.name}`
	setData('players', {
		...data.players,
		[id]: {
			...player,
			id: id
		}
	})
	return {playerId: id, sessionId: data.sessionId}
}
function addSpectator() {
	let id = uuid()
	// id = `DEBUG-SPECTATOR${data.spectators.length}`

	setData('spectators', [
		...data.spectators,
		id
	])

	return {spectatorId: id, sessionId: data.sessionId}
}
function addResponse(player) {
	if (Object.keys(data.responses).includes(player)) {
		data.responses[player]++
	} else {
		data.responses[player] = 1 
	}
}
function addDesign(design) {
	let id = uuid()
	// add design info with player uuid to designs
	setData('designs', {
		...data.designs,
		[id]: {
			...design,
			recipient: null,
			timestamp: generateTimestamp(),
			id: id
		},
	})
	// count player response
	addResponse(design.creatorId)
	return {designId: id}
}
function addSlogan(slogan) {
	let id = uuid()
	setData('slogans', {
		...data.slogans,
		[id]: {
			...slogan,
			recipient: null,
			id: id
		}
	})
	// count player response
	addResponse(slogan.creatorId)
	return {sloganId: id}
}
function addShirt(shirt) {
	const id = uuid()
	setData('shirts', {
		...data.shirts,
		[id]: {
			...shirt,
			status: 'unused',
			wins: 0,
			audienceVotes: 0,
			timestamp: generateTimestamp(),
			id: id,
		}
	})

	// mark parts as used
	data.designs[shirt.designId].recipient = "used"
	data.slogans[shirt.sloganId].recipient = "used"

	addResponse(shirt.creatorId)
	return {
		id: id,
		design: shirt.designId,
		slogan: shirt.sloganId
	}
}
function addVote(votes, id, shirt) {
	data[votes][id] = shirt
	return data.votes[id]
}

function updateShirt(shirt, status, wins, audience) {
	console.log("shirt", shirt);
	console.log("status", status);
	console.log("audience", audience);

	if (status !== undefined) {
		data.shirts[shirt].status = status
	}
	if (wins !== undefined) {
		if (wins === '++') {
			data.shirts[shirt].wins += 1
		} else if (wins === '--') {
			data.shirts[shirt].wins -= 1
		} else {
			data.shirts[shirt].wins = wins
		}
	}
	if (audience !== undefined) {
		audience = Number(audience)
		if (audience === NaN) {
			console.log("invalid audienceVote value");
			return
		}
		data.shirts[shirt].audienceVotes += audience
	}
}
function updateShirts(status, replace=null) {
	for (let shirt of Object.entries(data.shirts)) {
		if (replace !== null && shirt.status !== replace) return
		data.shirts[shirt.id].status = status
	}
}

function startGame() {
	data.round = 1
	data.phase = 1
	data.responses = {}
	data.limit = 3
	data.phaseTimestamp = new Date().getTime()
	data.inProgress = true

	return data.sessionId
}
function next(value) {
	data[value] = data[value] + 1
	data.phaseTimestamp = new Date().getTime()
	data.responses = {}
	// reset phase to 1 when starting new round
	if (value === 'round') {
		data.phase = 1
	}
	data.limit = (() => {
		// future progression for once voting is finished:
		console.log("round phase", data.round, data.phase)
		switch (data.round) {
			case 1: 
				switch (data.phase) {
					case 1: return 3  // drawing
					case 2: return 4  // slogans
					case 3: return 1  // combining
					case 4: return 1  // voting
				}
			case 2: 
				switch (data.phase) {
					case 1: return 1  // second round less creations
					case 2: return 2
					case 3: return 1
					case 4: return 1
				}
			case 3: 
				switch (data.phase) {
					case 1: return 0  // last round is just voting
					case 2: return 0
					case 3: return 0
					case 4: return 1  // voting (ignored by pages)
				}
		}
	})()

	// assigns recipients for combination phase
	if (data.phase === 3) {
		assignRecipients()
	} else if (data.phase === 4) {
		resetRecipients()
	}

	return data[value]
}
function final() {
	data.round = 3
	data.phase = 4
	data.responses = {}
	data.limit = 1
}
function results() {
	data.round = 4
	data.phase = 0
	data.responses = {}
	data.limit = 0
}

function assignRecipients() {
	// make shuffled list of player ids to pull from
	let playerIds = [
		...Object.keys(data.players),
		...Object.keys(data.players),
		...Object.keys(data.players)
	].sort((a, b) => 0.5 - Math.random())
	// add prop to each design to mark which player will be using it
	Object.values(data.designs)
		.filter(design => design.recipient !== 'used')
		.sort((a, b) => 0.5 - Math.random())
		.forEach(design => {
			const player = playerIds.pop()
			data.designs[design.id].recipient = player ?? null
		})

	// refill list for slogans
	playerIds = [
		...Object.keys(data.players),
		...Object.keys(data.players),
		...Object.keys(data.players),
		...Object.keys(data.players)
	].sort((a, b) => 0.5 - Math.random())
	// add prop to each slogan to mark which player will be using it
	Object.values(data.slogans)
		.filter(slogan => slogan.recipient !== 'used')
		.sort((a, b) => 0.5 - Math.random())
		.forEach(slogan => {
			const player = playerIds.pop()
			data.slogans[slogan.id].recipient = player ?? null
		})
}
function resetRecipients() {
	data.designs.forEach(design => {
		if (design.recipient === 'used') return
		design.recipient = undefined
	})
	data.slogans.forEach(slogan => {
		if (design.recipient === 'used') return
		slogan.recipient = undefined
	})
}
function giveRecipient(player) {
	let designs = Object.entries(data.designs)
		.filter(design => design[1].recipient === player)
		.map(design => data.designs[design[0]])
	let slogans = Object.entries(data.slogans)
		.filter(slogan => slogan[1].recipient === player)
		.map(slogan => data.slogans[slogan[0]])
	return {
		designs: designs,
		slogans: slogans
	}
}

function getStreakWinner(round=undefined) {
	let shirts = Object.values(data.shirts)

	if (round !== undefined) {
		shirts = shirts.filter(shirt => shirt.round === round)
	}
	shirts = shirts.sort((a, b) => {return b.wins - a.wins})

	//TODO: add tiebreaker stuff here too, for now it's just the first index
	return shirts[0]

}

function getResults() {
	// Audience Favorite: shirt with most audience votes (overall?)     (w/ winning shirt)
	//     TBD (no audience yet)

	//TODO: add tiebreakers the extra categories (most will take the first option in sorting which I believe is first submission but idk)

	return {
		// surviving shirt, KOH
		champion: (() => {
			let shirt = Object.values(data.shirts).find(shirt => shirt.status === 'winner')
			return {
				player: data.players[shirt.creatorId].name,
				shirt: {
					design: data.designs[shirt.designId],
					slogan: data.slogans[shirt.sloganId]
				}
			}
		})(),
		// player with most designs used in shirts
		artist: (() => {
			let a = mostFrequent(
				Object.values(data.shirts)
					.map(shirt => data.designs[ data.shirts[ shirt.id ].designId ].creatorId)
			)
			return {
				player: data.players[a].name ,
				amount: Object.values(data.designs).filter(item => item.creatorId === a).length
			} 
		})(),
		// player with most slogans used in shirts
		writer: (() => {
			let w = mostFrequent(
				Object.values(data.shirts)
					.map(shirt => data.slogans[ data.shirts[ shirt.id ].sloganId ].creatorId)
			)
			return {
				player: data.players[w].name ,
				amount: Object.values(data.slogans).filter(item => item.creatorId === w).length
			} 
		})(),
		// shirt that received the most audience votes and it's creator
		favorite: (() => {
			let s = Object.values(data.shirts)
				.sort((a, b) => {a.audienceVotes - b.audienceVotes})[0]
			return {
				player: data.players[s.creatorId].name,
				shirt: {
					design: data.designs[s.designId],
					slogan: data.slogans[s.sloganId]
				}
			}
		})(),
		// design with the fastest creation time and it's artist (design not shown)
		fastest: (() => {
			//TODO: this sorting may be off, be sure to verify it's correct when making the full timestamps
			let d = Object.values(data.designs)
				.sort((a, b) => a.timestamp - b.timestamp)[0]

			return {
				player: data.players[d.creatorId].name,
				time: d.timestamp
			}
		})(),
		// player with the least used designs and slogans
		ignored: data.players[mostFrequent(
			[...Object.values(data.designs), ...Object.values(data.slogans)]
			.filter(item => item.recipient === null)
			.map(item => item.creatorId)
		)].name,
		// player that submitted the most slogans and designs
		prolific: (() => {
			let p = mostFrequent(
				[...Object.values(data.designs), ...Object.values(data.slogans)]
				.map(item => item.creatorId)
			)
			return {
				player: data.players[p].name,
				amount: [...Object.values(data.designs), ...Object.values(data.slogans)]
					.filter(item => item.creatorId === p).length
			}
		})(),
		// player||shirt with the most wins over another
		shirtalities: (() => {
			let s = Object.values(data.shirts)
				.sort((a, b) => {a.wins - b.wins})[0]
			return {
				player: data.players[s.creatorId].name,
				shirt: {
					design: data.designs[s.designId],
					slogan: data.slogans[s.sloganId]
				}
			}
		})()
	}
}

export default {
	setData,
	getData,
	getAllData,
	addPlayer,
	addSlogan,
	startGame,
	next,
	addDesign,
	assignRecipients,
	resetRecipients,
	giveRecipient,
	addShirt,
	getSessionData,
	addVote,
	updateShirt,
	updateShirts,
	final,
	getStreakWinner,
	results,
	getResults,
	saveOverwrite,
	addSpectator,
};
