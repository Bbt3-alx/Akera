const buyGold = async (req, res) => {
  const { weight, carat, weight_w, amount, partner } = re.body;

  if (!weight || !carat || !weight_w || !amount || !partner) {
    return res
      .status(400)
      .json({ success: false, message: "All field are required." });
  }
};
