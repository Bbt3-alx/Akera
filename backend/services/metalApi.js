const myHeaders = new Headers();
const METAL_API = process.env.METAL_API;
myHeaders.append("x-access-token", METAL_API);
myHeaders.append("Content-Type", "application/json");

const requestOptions = {
  method: "GET",
  headers: myHeaders,
  redirect: "follow",
};

fetch("https://www.goldapi.io/api/XAU/USD", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
