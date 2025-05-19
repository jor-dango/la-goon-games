'use client'
import React from 'react'
import { getAuth, signOut } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { app } from '../firebase';

function page() {
    const db = getFirestore(app);
    function handleSignOut() {

        const auth = getAuth();
        signOut(auth).then(() => {
            console.log("Sign Out Successful");
            window.location.href = "/signup";
        }).catch((error) => {
            console.error(error);
        });
    }

    return (
        <div>
            <button onClick={handleSignOut}>Log Out</button>
        </div>
    )
}

export default page