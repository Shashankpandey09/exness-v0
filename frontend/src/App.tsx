

import {BrowserRouter,Routes, Route} from 'react-router-dom'
import SIGNUP_SIGIN from './Pages/SIGNUP_SIGIN'
import Dashboard from './Pages/Dashboard'
import ProtectedRoute from './Pages/ProtectedRoute'

function App() {


  return (
    <>
     <BrowserRouter>
     <Routes>
      <Route  path={'/'} element={<SIGNUP_SIGIN/>}/>
       <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
     </Routes>
     </BrowserRouter>
    </>
  )
}

export default App
