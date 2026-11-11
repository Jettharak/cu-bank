import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/auth.service";

const Login = () => {
  const accountIdInputRef = useRef();
  const passwordInputRef = useRef();
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, setIsPending] = useState(false);
  let navigate = useNavigate();

  function isNumeric(str) {
    if (typeof str !== "string") return false; 
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    let allCheck = true;
    const accountId = accountIdInputRef.current.value.trim();
    const password = passwordInputRef.current.value.trim();

    // Validate accountId
    if (accountId.length !== 10) {
      setError(true);
      setErrorMsg("Your account ID must be exactly 10 digits long.");
      allCheck = false;
    }
    if (!isNumeric(accountId)) {
      setError(true);
      setErrorMsg("Your account ID should contain numbers only.");
      allCheck = false;
    }

    // Validate password
    if (password.length !== 4) {
      setError(true);
      setErrorMsg("Your password must be exactly 4 digits long.");
      allCheck = false;
    }
    if (!isNumeric(password)) {
      setError(true);
      setErrorMsg("Your password should contain numbers only.");
      allCheck = false;
    }

    // Proceed if all validations pass
    if (allCheck) {
      AuthService.login(accountId, password).then(
        () => {
          setError(false);
          navigate("/account/");
          window.location.reload();
          setIsPending(false);
        },
        (error) => {
          setIsPending(false);
          setError(true);
          setErrorMsg(error.response.data.msg);
        }
      );
    } else {
      setIsPending(false);
    }
  };

  return (
    <div className="input-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Account Number:
          <input
            type="text"
            name="accountId"
            required
            cid="l1"
            placeholder="Please fill your account number (10 digits)"
            id="accountId"
            ref={accountIdInputRef}
          />
        </label>
        <label>
          Password:
          <input
            type="text"
            name="password"
            required
            cid="l2"
            placeholder="Please fill your password (4 digits)"
            id="password"
            ref={passwordInputRef}
          />
          {error && (
            <div>
              <label cid="login-error-mes">{errorMsg}</label>
            </div>
          )}
        </label>

        {!isPending && <button cid="lc">Login</button>}
        {isPending && <button>Login...</button>}
      </form>
    </div>
  );
};

export default Login;
