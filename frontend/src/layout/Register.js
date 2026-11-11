import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/auth.service";

const Register = () => {
  const accountIdInputRef = useRef();
  const passwordInputRef = useRef();
  const firstNameInputRef = useRef();
  const lastNameInputRef = useRef();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function isNumeric(str) {
    if (typeof str !== "string") return false; 
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  let navigate = useNavigate();

  const handleSubmit = async (e) => {
    setIsPending(true);
    e.preventDefault();

    let allCheck = true;
    const accountId = accountIdInputRef.current.value.trim();
    const password = passwordInputRef.current.value.trim();
    const firstName = firstNameInputRef.current.value.trim();
    const lastName = lastNameInputRef.current.value.trim();

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

    // Validate name length
    if (firstName.length + lastName.length > 29) {
      setError(true);
      setErrorMsg("The combined length of your first and last name must not exceed 30 characters.");
      allCheck = false;
    }

    if (allCheck) {
      const name = `${firstName} ${lastName}`.trim();
      const user = { accountId, password, name };

      AuthService.register(user).then(
        (response) => {
          setIsPending(false);
          alert("Registration successful!");
          navigate("/");
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
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Account Number:
          <input
            type="text"
            name="accountId"
            required
            placeholder="Please fill your account number (10 digits)"
            id="accountId"
            cid="r1"
            ref={accountIdInputRef}
          />
        </label>
        <label>
          Password:
          <input
            type="text"
            name="password"
            required
            placeholder="Please fill your password (4 digits)"
            id="password"
            cid="r2"
            ref={passwordInputRef}
          />
        </label>
        <label>
          First Name:
          <input
            type="text"
            name="firstName"
            required
            placeholder="Please fill your first name"
            id="firstName"
            cid="r3"
            ref={firstNameInputRef}
          />
        </label>
        <label>
          Last Name:
          <input
            type="text"
            name="lastName"
            required
            placeholder="Please fill your last name"
            id="lastName"
            cid="r4"
            ref={lastNameInputRef}
          />
        </label>
        {error && (
          <div>
            <label cid="register-error-mes">{errorMsg}</label>
          </div>
        )}
        {!isPending && <button cid="rc">Register</button>}
        {isPending && <button>Registering new user...</button>}
      </form>
    </div>
  );
};

export default Register;
