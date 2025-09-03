// src/components/Auth.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { store } from "../store/globalStore";
import { useNavigate } from "react-router-dom";

type AuthMode = "signin" | "signup";

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate=useNavigate()
  const BACKEND_URL=import.meta.env.VITE_BACKEND_URL
      const token=store((s)=>s.token)
  useEffect(()=>{
    if(!token) return;
    console.log('nav')
    navigate('/dashboard')
  },[token])
  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
  };

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    console.log(`${mode} with`, { email, password });
    // TODO: call your backend auth API
   try {
    const result=await axios.post(`${BACKEND_URL}/user/${mode}`,{username:email,password})
    const token=result.data.token
    store.setState({token:token})
   } catch (error) {
    console.log(error)
   }
  };

  return (
    <div className="flex justify-center items-center h-screen  bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="backdrop-blur-lg bg-black/50 p-8 rounded-2xl shadow-xl w-96">
        <h1 className="text-2xl font-bold text-center text-yellow-300 mb-6">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-lg bg-black/30 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-black/30 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full p-3 rounded-lg bg-yellow-300/80 text-black font-semibold shadow-lg hover:bg-yellow-300 transition duration-300"
          >
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-4">
          {mode === "signin" ? "Don’t have an account?" : "Already have an account?"}{" "}
          <button
            onClick={toggleMode}
            className="text-yellow-300 font-semibold hover:underline"
          >
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
