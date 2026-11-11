import { useEffect } from "react";
import { useState, useRef } from "react";
import AccountService from "../services/account.service";
import Card from "../ui/Card";
import { useNavigate } from "react-router-dom";

const Account = () => {
  const [isPending, setIsPending] = useState(false);
  const [billTarget, setBillTarget] = useState([]);
  const [account, setAccount] = useState([]);

  const depositAmongInputRef = useRef();
  const withdrawAmongInputRef = useRef();
  const transferAmongInputRef = useRef();
  const billPaymentAmongInputRef = useRef();
  const accountIdInputRef = useRef();

  const [errDep, setErrDep] = useState(false);
  const [errWit, setErrWit] = useState(false);
  const [errTra, setErrTra] = useState(false);
  const [errBil, setErrBil] = useState(false);
  const [errDepMsg, setErrDepMsg] = useState("");
  const [errWitMsg, setErrWitMsg] = useState("");
  const [errTraMsg, setErrTraMsg] = useState("");
  const [errBilMsg, setErrBilMsg] = useState("");
  
  function isNumeric(str) {
    if (typeof str !== "string") return false; 
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  const [isTrans, setIsTrans] = useState(false);
  let navigate = useNavigate();

  useEffect(() => {
    setIsPending(true);
    let data = JSON.parse(localStorage.getItem("user"));
    fetch("http://localhost:4000/api/v1/transactions/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + data.token,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.data.transactions.length === 0) {
          setIsTrans(false);
        } else {
          setIsTrans(true);
        }
        setAccount(data.data);
        setIsPending(false);
      })
      .catch((err) => console.log(err));
  }, []);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const amount = parseInt(depositAmongInputRef.current.value.trim());
    if (amount <= 0) {
      setErrDep(true);
      setIsPending(false);
      setErrDepMsg("The amount must be greater than 0. Please enter a positive number.");
    } else {
      await AccountService.deposit(amount).then(
        () => {
          setIsPending(false);
          setErrDep(false);
          navigate("/account/");
          window.location.reload();
        },
        (error) => {
          setIsPending(false);
          setErrDep(true);
          setErrDepMsg(error.response.data.msg);
        }
      );
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const amount = parseInt(withdrawAmongInputRef.current.value.trim());
    if (amount <= 0) {
      setErrWit(true);
      setIsPending(false);
      setErrWitMsg("The amount must be greater than 0. Please enter a positive number.");
    } else if (account.balance < amount) {
      setErrWit(true);
      setIsPending(false);
      setErrWitMsg("Your balance is not enough to complete the withdrawal.");
    } else {
      await AccountService.withdraw(amount).then(
        () => {
          navigate("/account/");
          setErrWit(false);
          setIsPending(false);
          window.location.reload();
        },
        (error) => {
          setIsPending(false);
          setErrWit(true);
          setErrWitMsg(error.response.data.msg);
        }
      );
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    let allCheck = true;
    const amount = parseInt(transferAmongInputRef.current.value.trim());
    const accountId = accountIdInputRef.current.value.trim();

    if (accountId === account.account) {
      setErrTra(true);
      setIsPending(false);
      setErrTraMsg("You cannot transfer to your own account.");
      allCheck = false;
    }
    if (accountId.length !== 10) {
      setErrTra(true);
      setIsPending(false);
      setErrTraMsg("Your account ID must be exactly 10 digits long.");
      allCheck = false;
    }
    if (!isNumeric(accountId)) {
      setErrTra(true);
      setIsPending(false);
      setErrTraMsg("Your account ID should contain numbers only.");
      allCheck = false;
    }
    if (amount <= 0) {
      setErrTra(true);
      setIsPending(false);
      setErrTraMsg("The amount must be greater than 0. Please enter a positive number.");
      allCheck = false;
    }
    if (account.balance < amount) {
      setErrTra(true);
      setIsPending(false);
      setErrTraMsg("Your balance is not enough to complete the transfer.");
      allCheck = false;
    }

    if (allCheck) {
      await AccountService.transfer(accountId, amount).then(
        () => {
          setIsPending(false);
          navigate("/account/");
          setErrTra(false);
          window.location.reload();
        },
        (error) => {
          setIsPending(false);
          setErrTra(true);
          setErrTraMsg(error.response.data.msg);
        }
      );
    }
  };

  const handleBillPaymentSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const amount = parseInt(billPaymentAmongInputRef.current.value.trim());
    if (amount <= 0) {
      setErrBil(true);
      setIsPending(false);
      setErrBilMsg("The amount must be greater than 0. Please enter a positive number.");
    } else if (account.balance < amount) {
      setErrBil(true);
      setIsPending(false);
      setErrBilMsg("Your balance is not enough to complete the bill payment.");
    } else {
      await AccountService.billPayment(billTarget, amount).then(
        () => {
          setIsPending(false);
          setErrBil(false);
          navigate("/account/");
          window.location.reload();
        },
        (error) => {
          setIsPending(false);
          setErrBil(true);
          setErrBilMsg(error.response.data.msg);
        }
      );
    }
  };


  return (
    <div className="account-form">
      <div></div>
      <div>
        {isPending && <div>Loading...</div>}
        {account && (
          <article>
            <h2>Account ID:</h2>
            <h1>{account.account}</h1>
            <h2>Name:</h2>
            <h1>{account.name}</h1>
            <h2>Balance:</h2>
            <h1>{account.balance}</h1>
          </article>
        )}
      </div>
      <Card>
        <div className="account-form">
          <h2>Deposit</h2>
        </div>
        <div className="account-form">
          <form onSubmit={handleDepositSubmit}>
            <label>
              Please put your amount:
              <input
                type="number"
                name="amount"
                required
                cid='d1'
                placeholder="Please fill amount"
                id="amount"
                ref={depositAmongInputRef}
              />
            </label>
            {errDep && (
              <div>
                <label cid='deposite-error-mes'>{errDepMsg}</label>
              </div>
            )}
            {!isPending && <button cid='dc'>Confirm</button>}
            {isPending && <button>Confirm...</button>}
          </form>
        </div>
      </Card>
      <Card>
        <div className="account-form">
          <h2>Withdraw</h2>
        </div>
        <div className="account-form">
          <form onSubmit={handleWithdrawSubmit}>
            <label>
              Please put your amount:
              <input
                type="number"
                name="amount"
                required
                cid = 'w1'
                placeholder="Please fill amount"
                id="amount"
                ref={withdrawAmongInputRef}
              />
            </label>
            {errWit && (
              <div>
                <label cid='withdraw-error-mes'>{errWitMsg}</label>
              </div>
            )}
            {!isPending && <button cid='wc'>Confirm</button>}
            {isPending && <button>Confirm...</button>}
          </form>
        </div>
      </Card>
      <Card>
        <div className="account-form">
          <h2>Transfer</h2>
        </div>
        <div className="account-form">
          <form onSubmit={handleTransferSubmit}>
            <div>
              <label>
                Please put target Account ID:
                <input
                  type="text"
                  name="accountId"
                  required
                  cid='t1'
                  placeholder="Please fill your account number 10 digits"
                  id="accountId"
                  ref={accountIdInputRef}
                />
              </label>
            </div>
            <div>
              <label>
                Please put your amount:
                <input
                  type="number"
                  name="amount"
                  required
                  cid='t2'
                  placeholder="Please fill amount"
                  id="amount"
                  ref={transferAmongInputRef}
                />
              </label>
            </div>
            {errTra && (
              <div>
                <label cid='transfer-error-mes'>{errTraMsg}</label>
              </div>
            )}
            {!isPending && <button cid='tc'>Confirm</button>}
            {isPending && <button>Confirm...</button>}
          </form>
        </div>
      </Card>
      <Card>
        <div className="account-form">
          <h2>Bill Payment</h2>
        </div>
        <div className="account-form">
          <form onSubmit={handleBillPaymentSubmit}>
            <div className="radio">
              <input
                type="radio"
                name="billTarget"
                required
                cid= 'b1'
                value="water"
                onChange={(e) => setBillTarget(e.target.value)}
              />
              Water Charge
              <input
                type="radio"
                name="billTarget"
                required
                cid= 'b2'
                value="electric"
                onChange={(e) => setBillTarget(e.target.value)}
              />
              Electric Charge
              <input
                type="radio"
                name="billTarget"
                required
                cid= 'b3'
                value="phone"
                onChange={(e) => setBillTarget(e.target.value)}
              />
              Phone Charge
            </div>
            <div>
              <label>
                Please put your amount:
                <input
                  type="number"
                  name="amount"
                  required
                  cid='b4'
                  placeholder="Please fill amount"
                  id="amount"
                  ref={billPaymentAmongInputRef}
                />
              </label>
            </div>
            {errBil && (
              <div>
                <label cid='billpayment-error-mes'>{errBilMsg}</label>
              </div>
            )}
            {!isPending && <button cid='bc'>Confirm</button>}
            {isPending && <button>Confirm...</button>}
          </form>
        </div>
      </Card>
      <div className="history-list">
        <article>
          <h2>History</h2>
        </article>
        {isTrans && (
          <div className="account-form">
            {account.transactions.map((transaction) => (
              <div key={transaction._id}>
                <Card>
                  <div>
                    <h2>{transaction.title}</h2>
                    <p>date: {transaction.date}</p>
                    <p>target: {transaction.target}</p>
                    <p>amount: {transaction.amount}</p>
                    <p>balance: {transaction.balance}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
