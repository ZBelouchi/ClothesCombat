const {log} = require('console')

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const sessionData = require('./sessionData.cjs')
const dotenv = require('dotenv')

dotenv.config({path: './.env'})

const app = express()
const DEBUG = Number(process.env.VITE_DEBUG_MODE)
const hostname = process.env.VITE_HOSTNAME || 'http://localhost'
const port = process.env.VITE_PORT || 3000

//NOTE: these cors configurations are not good for security, find a better solution before full publishing
app.use(cors())
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
	res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
	next()
})

app.use(bodyParser.json({limit: '1gb'}))

const root = path.join(__dirname, 'dist')
app.use(express.static(root))

app.get('/all', (req, res) => {
	res.json({ success: true, ...sessionData.getAllData() })
})
app.get('/sessionId', (req, res) => {
	res.json({ success: true, sessionId: sessionData.getData('sessionId') })
})
app.get('/round', (req, res) => {
	res.json({ success: true, round: sessionData.getData('round') })
})
app.get('/icons', (req, res) => {
let nameKey = {}
	Object.entries(sessionData.getData('players'))
		.forEach(([id, data]) => {
			// log(id, data)
			nameKey[id] = data.name
		})
	res.json({
		success: true, 
		icons: sessionData.getData('icons'),
		nameKey: nameKey
	})
})
app.get('/player/:id', (req, res) => {
	let id = req.params.id
	res.json({success: true, player: sessionData.getData('players')[id]})
})
app.get('/players', (req, res) => {
	res.json({ success: true, players: sessionData.getData('players') })
})
app.get('/spectators', (req, res) => {
	res.json({ success: true, spectators: sessionData.getData('spectators') })
})
app.get('/validate', (req, res) => {
	const {strict=true, session, player, spectator} = req.query
	const strictMode = strict !== 'false'
	let report = {
		inProgress: sessionData.getData('inProgress'),
		allValid: true
	}
	
	// if sessionId is null, session hasn't started
	if (sessionData.getData('sessionId') === null) {
		res.status(500).json({success: false, message: "sessionId is not set, there is no session in progress", received: req.query, })
	}
	// fail if nothing given to validate
	if (session === undefined && player === undefined && spectator === undefined) {
		res.status(500).json({success: false, message: "nothing was given for validation", received: req.query, })
	}
	queryLoop: for (let q of ["session", "player", "spectator"]) {
		if (req.query[q] === undefined) break queryLoop
		switchCase: switch (q) {
			case "session":
				report[q] = sessionData.getData('sessionId') === session
				if (!report[q]) report.allValid = false
				break switchCase
			case "player":
				report[q] = Object.keys(sessionData.getData('players')).includes(player)
				if (!report[q]) report.allValid = false
				break switchCase
			case "spectator":
				report[q] = sessionData.getData('spectators').includes(spectator)
				if (!report[q]) report.allValid = false
				break switchCase
			default:
				break switchCase
		}
	}

	// Strict Mode - all must be valid to pass (default)
	if (strictMode) {
		if (!report.allValid) {
			res.status(500).json({
				success: false,
				message: 'one or more items was not valid (checking in strict mode)',
				received: req.query,
				report: report
			})
			return
		}
		res.json({
			success: true,
			message: 'all items were valid (checking in strict mode)',
			received: req.query,
			report: report
		})
		return
	}

	// Loose Mode - at least one must be valid
	if (!(Object.values(report).includes(true))) {
		res.status(500).json({
			success: false,
			message: 'no items were valid',
			received: req.query,
			report: report
		})
		return
	}
	res.json({
		success: true,
		message: 'one or more items were valid',
		received: req.query,
		report: report
	})

})
app.get('/designs', (req, res) => {
	const {recipient, creator, background, amount} = req.query
	let response
	let message = "request was within supply limit"

	if (recipient !== undefined) {
		// recipient=any (sorts items allocated to any player, ignoring unused or used items)
		// recipient=null (sorts for unused items only)
		response = recipient === 'any'
			? Object.values(sessionData.getData('designs')).filter(design => (design.recipient !== null && design.recipient !== 'used'))
			: recipient === 'null'
			? Object.values(sessionData.getData('designs')).filter(design => design.recipient === null)
			: Object.values(sessionData.getData('designs')).filter(design => design.recipient === string)
	} else {
		response = sessionData.getData('slogans')
	}

	if (creator !== undefined) {
		response = Object.values(response).filter(design => design.creatorId === creator)
	}
	if (background !== undefined) {
		response = Object.values(response).filter(design => design.backgroundColor === background)
	}

	if (amount !== undefined) {
		if (Object.keys(response).length >= amount) {
			response = response.slice(0, amount)
		} else {
			message = 'amount requested exceeds supply'
		}
	}

	res.json({success: true, shirts: response, message: message})
})
app.get('/design/:id', (req, res) => {
	let id = req.params.id
	res.json({success: true, design: sessionData.getData('designs')[id]})
})
app.get('/slogans', (req, res) => {
	const {recipient, creator, amount} = req.query
	let response
	let message = "request was within supply limit"

	if (recipient !== undefined) {
		// recipient=any (sorts items allocated to any player, ignoring unused or used items)
		// recipient=null (sorts for unused items only)
		response = recipient === 'any'
			? Object.values(sessionData.getData('slogans')).filter(slogan => (slogan.recipient !== null && slogan.recipient !== 'used'))
			: recipient === 'null'
			? Object.values(sessionData.getData('slogans')).filter(slogan => slogan.recipient === null)
			: Object.values(sessionData.getData('slogans')).filter(slogan => slogan.recipient === string)
	} else {
		response = sessionData.getData('slogans')
	}

	if (creator !== undefined) {
		response = Object.values(response).filter(slogan => slogan.creatorId === creator)
	}

	if (amount !== undefined) {
		if (Object.keys(response).length >= amount) {
			response = response.slice(0, amount)
		} else {
			message = 'amount requested exceeds supply'
		}
	}

	res.json({success: true, shirts: response, message: message})
})
app.get('/slogan/:id', (req, res) => {
	let id = req.params.id
	res.json({success: true, slogan: sessionData.getData('slogans')[id]})
})
app.get('/shirts', (req, res) => {
	const {status, round, deep, amount} = req?.query
	let response
	let message = "request was within supply limit"

	// filter by status
	if (status !== undefined) {
		response = Object.values(sessionData.getData('shirts')).filter(shirt => shirt.status === status)
	} else {
		response = sessionData.getData('shirts')
	}

	if (round !== undefined) {
		response = Object.values(response).filter(shirt => shirt.round === round)
	}

	// include deep properties (full objects of designs and slogans instead of just ids)
	if (deep) {
		response = response.map(shirtId => {
			let shirt = sessionData.getData('shirts')[shirtId.id]
			return {
				shirt: shirt,
 				design: sessionData.getData('designs')[shirt.designId],
 				slogan: sessionData.getData('slogans')[shirt.sloganId]
 			}
		})
	}

	if (amount !== undefined) {
		if (Object.keys(response).length >= amount) {
			response = response.slice(0, amount)
		} else {
			message = 'amount requested exceeds supply'
		}
	}

	res.json({success: true, shirts: response, message: message})
})
app.get('/shirt-elements/:shirt', (req, res) => {
	const shirtId = req.params.shirt
	const shirt = sessionData.getData('shirts')[shirtId]
	res.json({
		success: true,
		elements: {
			shirt: shirt,
			design: sessionData.getData('designs')[shirt.designId],
			slogan: sessionData.getData('slogans')[shirt.sloganId]
		}
	})
})
app.get('/parts/:player', (req, res) => {
	const player = req.params.player
	const ings = sessionData.giveRecipient(player)
	res.json({success: true, ...ings})
	res.json({success: true, test: player})
})
app.get('/votes', (req, res) => {
	const group = req.query.group
	res.json({success: true, votes: sessionData.getData(group)})
})
app.get('/vote/:id', (req, res) => {
	const group = req.query.group
	const id = req.params.id
	if (!(Object.keys(sessionData.getData(group)).includes(id))) {
		res.status(500).json({success: false, message: `id ${id} has not voted in ${group}`})
		return
	}
	res.json({success: true, shirt: sessionData.getData(group)[id]})
})
// TODO: get /vote/:spectator
app.get('/streak-winner', (req, res) => {
	let {round} = req.query

	console.log(round);
	let winner = sessionData.getStreakWinner(round)
	res.json({success:true, id: winner.id})
})
app.get('/results', (req, res) => {
	const results = sessionData.getResults()
	res.json({success: true, ...results})
})

app.post('/player', (req, res) => {
	// check if player list already at 8 players
	if (Object.values(sessionData.getData('players')).length === 8) {
		res.status(500).send({success: false, message: "player limit reached"})
		return
	}
	//NOTE: temporarily removed dupe checks for faster dev testing
	// // check if given player data has any duplicates to others
	// // name
	if (Object.values(sessionData.getData('players')).map(player => player.name).includes(req.body.name)) {
		res.status(500).send({success: false, message: "name already in use"})
		return
	}
	// add player
	let ids = sessionData.addPlayer(req.body)
	res.status(201).send({success: true, message: "player created", ...ids})
})
app.post('/spectator', (req, res) => {
	let ids = sessionData.addSpectator()
	res.status(201).send({success: true, message: "spectator added", ...ids})
})
app.post('/design', (req, res) => {
	// check for 3 existing responses from player, if so exit
	if (sessionData.getData('responses')[req.body.creatorId] === 3) {
		res.status(500).send({success: false, message: "player has already submitted a design for this round"})
		return
	}
	// add design urls to designs with player id and player to responses list
	let id = sessionData.addDesign(req.body)
	res.send({success: true, ...id})
})
app.post('/slogan', (req, res) => {
	let id = sessionData.addSlogan(req.body)
	res.send({success: true, ...id})
})
app.post('/shirt', (req, res) => {
	const shirt = req.body
	const shirtData = sessionData.addShirt(shirt)
	res.json({success: true, ...shirtData})
})
app.post('/vote', (req, res) => {
	const {group, id, shirt} = req.body
	const vote = sessionData.addVote(group, id, shirt)

	if (vote === undefined) {
		res.status(500).json({success: false, message: `could not add vote to ${group} from ${id} for ${shirt}`})
		return
	}
	res.json({success: true, vote: vote})
})

app.delete('/player/:id', (req, res) => {
	const id = req.params.id
	const player = sessionData.removePlayer(id)

	res.json({success: true, message: `player removed`, ...player})
})

app.patch('/start', (req, res) => {
	let players = Object.values(sessionData.getData('players'))

	// check for min of 3 players
	if (players.length < 3) {
		res.status(500).json({success: false, message: 'player limit (3) not reached'})
		return
	}
	// check for somehow over max of 8 players (9th shouldn't be able to join but just in case)
	if (players.length > 8) {
		res.status(500).json({success: false, message: 'player limit (3) exceeded'})
		return
	}

	// check for all players having icons
	if (!(players.every(player => player.icon !== null))) {
		res.status(500).json({success: false, message: 'some players have not selected an icon'})
		return
	}

	const id = sessionData.startGame()
	res.json({success: true, message: `started new game`, sessionId: id})
})
app.patch('/next', (req, res) => {
	// check if phase exceeds limit (4)
	if (sessionData.getData('phase') >= 4) {

		// check if next round is 3 (final)
		if (sessionData.getData('round') + 1 === 3) {
			// go to final round
			console.log("FINAL ROUND");
			sessionData.final()
			res.json({success: true, message: `changed round to 3 (final round)`})

		// check if next round is 4 (results)
		} else if (sessionData.getData('round') + 1 === 4) {
			// go to results
			console.log("RESULTS");
			sessionData.results()
			res.json({success: true, message: `changed round to 4 (results)`})

		} else if (sessionData.getData('round') + 1 === 4) {
		// check if ending round was the last round
			// go to results
			console.log("TO RESULTS");
			res.json({success: true, message: `processing results`})

		} else {
			// next round (reset phases)
			console.log("TO NEXT ROUND");
			const round = sessionData.next('round')
			res.json({success: true, message: `changed round to ${round}`})
		}
	} else {
		// next phase
		console.log("TO NEXT PHASE");
		const phase = sessionData.next('phase')
		res.json({success: true, message: `changed phase to ${phase}`})
	}
})
app.patch('/shirt/:shirt', (req, res) => {
	const shirt = req.params.shirt
	const {status, wins, audience} = req.body
	sessionData.updateShirt(shirt, status, wins, audience)
	res.json({success: true})
})
app.patch('/shirts', (req, res) => {
	const status = req.body.status
	const replace = req.query.replace
	sessionData.updateShirt(status, replace)
	res.json({success: true})
})
app.patch('/icon/:icon', (req, res) => {
	const icon = Number(req.params.icon)
	const player = req.body.player
	let nameKey = {}
	Object.entries(sessionData.getData('players'))
		.forEach(([id, data]) => {
			// log(id, data)
			nameKey[id] = data.name
		})

	log(nameKey)
	const newIcon = sessionData.selectIcon(player, icon)

	if (newIcon === undefined) {
		res.status(500).json({
			success: false, 
			message: 'could not perform icon change',
			icons: sessionData.getData('icons'),
			nameKey: nameKey
		})
	}
	res.json({
		success: true, 
		message: `change icon ${newIcon}`, 
		icons: sessionData.getData('icons'),
		nameKey: nameKey
	})
})

app.put('/clear/votes', (req, res) => {
	sessionData.setData('votes', {})
	sessionData.setData('audienceVotes', {})
	res.json({success: true})
})
app.put('/clear/players', (req, res) => {
	sessionData.setData('players', {})
	sessionData.setData('icons', sessionData.getData('icons').fill(null, 0, 17))
})

app.put('/reset', (req, res) => {
	const keepPlayers = req.body.keepPlayers
	// reset game to starting data
	const newData = sessionData.resetData(keepPlayers)
	
	res.json({success: true, data: newData})
})

app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, 'dist', 'index.html'))
	return
})
app.get('*', (req, res) => {
	// Handle all other routes here
	res.send('404 - Not Found');
  });

app.listen(port, () => {
	// sessionData.saveOverwrite()
	if (DEBUG) {
		console.log("DEBUG MODE ON");
	} else {
		console.log("DEBUG MODE OFF");
	}
	console.log(`Listening to ${hostname} on port ${port}\n\n`)
})

app.on('request', () => {
	console.log('got request');
})