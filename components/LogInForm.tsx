"use client"
import React, { useState } from 'react'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { app } from '@/app/firebase';

function LogInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const db = getFirestore(app); // This literally does nothing but Firebase hates me if it's not here so wtv
  const auth = getAuth();

  async function handleLogIn() {
    setLoading(true);
    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        window.location.href = '/form';
        setLoading(false);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        
        if (errorCode === "auth/invalid-credential") {
          setErrorMsg("Password is incorrect");
        }
        else if (errorCode === "auth/missing-password") {
          setErrorMsg("Please enter a password");
        }
        else if (errorCode === "auth/invalid-email") {
          setErrorMsg("Email is invalid");
        }

        console.log("error code: ", errorCode);
        console.log("error message: ", errorMessage);
        setLoading(false);
      });
  }

  return (
    <div className='flex flex-col gap-8'>
      <small className={`${errorMsg ? "block" : "hidden"} text-destructive`}>{errorMsg}</small>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Email address"
        className='px-4 py-2 border border-border text-textdark rounded-lg transition ease-in-out transform focus:-translate-y-1 focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer'
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="Password"
        className='px-4 py-2 border border-border text-textdark rounded-lg transition ease-in-out transform focus:-translate-y-1 focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer'
      />
      <button
        className={`px-4 py-2 ${loading ? "bg-buttondisabled" : "bg-accent hover:bg-buttonhover cursor-pointer"} transition-all rounded-lg`}
        onClick={handleLogIn}
        disabled={loading}
      >
        Log In
      </button>
      <a className='text-textsecondary hover:text-textsecondary/80 cursor-pointer text-center' onClick={() => window.location.href = '/signup'}>Don&apos;t have an account?</a>
    </div>
  )
}

export default LogInForm