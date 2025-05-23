"use client"
import React, { useState } from 'react'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, User } from "firebase/auth";
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { db, app } from '@/app/firebase';

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const auth = getAuth();

  async function handleSignUp() {
    if (name === "") {
      setErrorMsg("Please enter a name");
      return;
    }

    setLoading(true);
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up 
        const user = userCredential.user;
        addUser(user).then(() =>
          handleLogIn()
        );
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        if (errorCode === "auth/email-already-in-use") {
          setErrorMsg("Email already in use");
        }
        else if (errorCode === "auth/weak-password") {
          setErrorMsg("Password must be at least 6 characters");
        }
        else if (errorCode === "auth/invalid-email") {
          setErrorMsg("Email is invalid");
        }
        else if (errorCode === "auth/missing-password") {
          setErrorMsg("Please enter a password");
        }
        else {
          setErrorMsg(errorCode);
        }
        console.log("error code: ", errorCode);
        console.log("error message: ", errorMessage);
        setLoading(false);
      })
  }

  async function addUser(user: User) {
    await setDoc(doc(db, "players", user.uid), {
      name: name,
      points: 0
    });
  }

  async function handleLogIn() {
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
        console.log("error code: ", errorCode);
        console.log("error message: ", errorMessage);

        setLoading(false);
      });
  }

  return (
    <div className='flex flex-col gap-8'>
      <small className={`${errorMsg ? "block" : "hidden"} text-destructive`}>{errorMsg}</small>
      <input
        type="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Name"
        className='px-4 py-2 border border-border text-textdark rounded-lg transition ease-in-out transform focus:-translate-y-1 focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer'
      />
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
        onClick={handleSignUp}
        disabled={loading}
      >
        Sign Up
      </button>
      <a className='text-textsecondary hover:text-textsecondary/80 cursor-pointer text-center' onClick={() => window.location.href = '/login'}>Already have an account?</a>
    </div>
  )
}

export default SignUpForm