import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProblemList from './pages/problems/ProblemList';
import ProblemDetail from './pages/problems/ProblemDetail';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import CreateProblem from './InnerComponents/AdminPanel/CreateProblem.jsx';
import Admin from './pages/Admin.jsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/themeContext.jsx';

function App() {
	const location = useLocation();

	const hideFooter =
		location.pathname === '/profile' ||
		location.pathname === '/dashboard' ||
		/^\/problems\/[^/]+$/.test(location.pathname);

	return (
		<ThemeProvider>
			<AuthProvider>
				<div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-[#1a1a1a] dark:text-gray-200">
					<Navbar />

					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/login" element={<Login />} />
						<Route path="/register" element={<Register />} />
						<Route path="/problems" element={<ProblemList />} />
						<Route path="/problem" element={<ProblemList />} />
						<Route path="/problems/:id" element={<ProblemDetail />} />
						<Route path="/profile" element={<Profile />} />
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/admin" element={<Admin />} />
						<Route path="/admin/create" element={<CreateProblem />} />
					</Routes>

					{/* {!hideFooter && <Footer />} */}
				</div>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;