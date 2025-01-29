const myHeaders = new Headers();
myHeaders.append("x-access-token", "goldapi-o2vg1sm6e660b9-io");
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
