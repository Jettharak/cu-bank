export default function authHeader() {
  let data = JSON.parse(localStorage.getItem("user"));
  console.log(data.token);
  if (data && data.token) {
    return { 'Authorization': 'Bearer ' + data.token };
    //return { "x-auth-token": user.accessToken };
  } else {
    return {};
  }
}
