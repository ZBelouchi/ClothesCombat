import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'

import Client from './Client'
import Session from './Session'

import '../styles/index.sass'

export default function App() {
	return (
		<Router>
			<Routes>
					<Route path='/' element={<Client />}/>
					<Route path='/session' element={<Session />} />
					<Route path='*' element={<p>ERROR ROUTE REACHED</p>} />
			</Routes>
		</Router>
	)
}