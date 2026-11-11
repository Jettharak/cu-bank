import axios from "axios";
import authHeader from "./auth-header";

const API_URL = "http://localhost:4000/api/v1/transactions/";

const getAccount = (accountId) => {
  let data = JSON.parse(localStorage.getItem("user"));
  fetch("http://localhost:4000/api/v1/transactions/" + accountId, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.token,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data.data;
    })
    .catch((err) => console.log(err));
};

//
const getMyAccount = () => {
  let data = JSON.parse(localStorage.getItem("user"));
  fetch("http://localhost:4000/api/v1/transactions/", {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.token,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data.data;
    })
    .catch((err) => console.log(err));
};

//

const withdraw = (amount) => {
  return axios.put(
    API_URL,
    {
      action: "withdraw",
      balance: amount,
    },
    { headers: authHeader() }
  );
};

const deposit = (amount) => {
  return axios.put(
    API_URL,
    {
      action: "deposit",
      balance: amount,
    },
    { headers: authHeader() }
  );
};

const transfer = async (target, amount) => {
  return axios.put(
    API_URL,
    {
      action: "transfer",
      target: target,
      balance: amount,
    },
    { headers: authHeader() }
  );
};

const billPayment = (target, amount) => {
  return axios.put(
    API_URL,
    {
      action: "billpayment",
      target: target,
      balance: amount,
    },
    { headers: authHeader() }
  );
};

const AccountService = {
  getAccount,
  withdraw,
  deposit,
  transfer,
  billPayment,
  getMyAccount,
};

export default AccountService;
