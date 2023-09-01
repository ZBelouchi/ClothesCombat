import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'

import Client from './Client'
import Host from './Host'
import Server from './Server'

import '../styles/index.sass'

export default function App() {
	return (
		<Router>
			<Routes>
					<Route path='/' element={<Client />}/>
					<Route path='/host' element={<Host />} />
					<Route path='/server' element={<Server />} />
					<Route path='*' element={<p>ERROR ROUTE REACHED</p>} />
			</Routes>
		</Router>
	)
}