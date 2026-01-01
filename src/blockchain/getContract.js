import { ethers } from "ethers";
import ABI from "../contracts/Immulink.json";

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  return new ethers.Contract(
    import.meta.env.VITE_CONTRACT_ADDRESS,
    ABI,
    signer
  );
};
