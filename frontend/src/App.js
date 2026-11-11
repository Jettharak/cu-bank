import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './layout/Login';
import Account from './layout/Account';
import Register from './layout/Register';
import NotFound from './NotFound';
import AuthService from './services/auth.service';
// import AuthVerify from './common/AuthVerify';

function App() {
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setIsLogin(true);
    }
  }, []);

  const logOut = () => {
    AuthService.logout();
    setIsLogin(false);
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>CU Bank</h1>
          <div className="links">
            {!isLogin && <Link to="/">LOG IN</Link>}
            {!isLogin && <Link to="/register">Register</Link>}
            {isLogin && <Link to="/account">Account</Link>}
            {isLogin && <a href="/" onClick={logOut}>LOG OUT</a>}
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
