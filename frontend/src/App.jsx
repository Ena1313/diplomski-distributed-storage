import { BrowserRouter, Routes, Route } from "react-router-dom"

import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Upload from "./pages/Upload"
import Files from "./pages/Files"
import Nodes from "./pages/Nodes"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/files" element={<Files />} />
          <Route path="/nodes" element={<Nodes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App