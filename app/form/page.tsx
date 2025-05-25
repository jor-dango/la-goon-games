'use client'
import React, { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, DocumentData, getDoc, getFirestore, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { AuthProvider } from '@/context/AuthProvider';

type Challenge = {
  author: string;
  challenge: string;
  challengeID: number;
  challengeType: "Negative" | "Daily" | "Normal" | null;
  completed: boolean;
  pointval: number;
  assignedPlayer: string | null;
}

type UserInfo = {
  name: string;
  points: number;
}

function Form() {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeInfo, setChallengeInfo] = useState<Challenge>({
    author: "",
    challenge: "",
    challengeID: -1,
    challengeType: null,
    completed: false,
    pointval: 0,
    assignedPlayer: null
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "metadata", "counters"), (doc) => {
      if (doc.exists() && doc.data() && "numChallenges" in doc.data()) {
        setChallengeInfo(prevState => ({ ...prevState, challengeID: doc.data().numChallenges }))
      }
    })

    getUser();
  }, [])
  useEffect(() => {
    getUserInfo();
  }, [user]);


  // function handleSignOut() {
  //   const auth = getAuth();
  //   signOut(auth).then(() => {
  //     console.log("Sign Out Successful");
  //     window.location.href = "/signup";
  //   }).catch((error) => {
  //     console.error(error);
  //   });
  // }

  async function getUser() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      setUser(user);
      console.log("user: ", user)
    })
  }

  async function getUserInfo() {
    if (user) {
      console.log("uid: ", user.uid)
      const docSnap = await getDoc(doc(db, "players", user.uid));
      if (docSnap.exists()) {
        setUserInfo(docSnap.data() as UserInfo); // Claude got me right w this syntax, didn't know this was a thing in typescript
        setChallengeInfo(prevState => ({ ...prevState, author: docSnap.data().name }))
      }
    }
  }

  async function handleSubmit() {
    if (!challengeInfo.challenge) {
      setErrorMsg("Please enter a challenge.");
      return;
    }
    if (!challengeInfo.challengeType) {
      setErrorMsg("Please select a challenge type.");
      return;
    }
    setErrorMsg("");
    // console.log('Challenge being submitted: ', challengeInfo)
    try {
      setLoading(true);
      await setDoc(doc(db, "challengeBank", challengeInfo.challengeID.toString()), {
        ...challengeInfo
      })
      await updateDoc(doc(db, "metadata", "counters"), {
        numChallenges: challengeInfo.challengeID + 1
      })
    }
    catch (error) {
      console.error(error);
    }
    finally {
      setLoading(false);
      window.alert("Challenge successfully submitted!")
      setChallengeInfo(prevState => ({...prevState, challenge: ""}));
      setChallengeInfo(prevState => ({...prevState, challengeType: null}));
    }
  }

  return (
    <AuthProvider>
      <div className="w-full h-[100vh] flex justify-center items-center">
        <div className="max-w-[95%] flex flex-col gap-8 p-8 border border-border rounded-2xl bg-bglight">
          {/* <button onClick={handleSignOut}>Log Out</button> */}
          <div>
            <small className='text-textsecondary'>Welcome {userInfo?.name}!</small>
            <h3>Submit a Challenge</h3>
          </div>
          <small className={`${errorMsg ? "block" : "hidden"} ml-1 text-destructive`}>{errorMsg}</small>
          <div className='space-y-1'>
            <p className='ml-1'>Type in your challenge</p>
            <textarea
              value={challengeInfo.challenge}
              onChange={(e) => setChallengeInfo({ ...challengeInfo, challenge: e.target.value })}
              required
              placeholder="Input your challenge"
              style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word' }}
              className='px-4 py-2 h-20 w-[30rem] max-w-[80vw] border border-border text-textdark rounded-lg transition ease-in-out focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <p className='ml-1'>Select the type of challenge</p>
            <DropdownMenu>
              <DropdownMenuTrigger className='w-fit'>
                <div
                  className='px-4 py-2 flex flex-row gap-4 border border-border text-textdark rounded-lg transition ease-in-out focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer'
                >
                  <p className={`${challengeInfo.challengeType ? "" : "text-textsecondary"}`}>
                    {challengeInfo.challengeType ?? "Select"}
                  </p>
                  <ChevronDown className='stroke-textsecondary' />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setChallengeInfo({ ...challengeInfo, challengeType: "Normal" })} className='focus:bg-innercontainer'>Normal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChallengeInfo({ ...challengeInfo, challengeType: "Daily" })} className='focus:bg-innercontainer'>Daily</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChallengeInfo({ ...challengeInfo, challengeType: "Negative" })} className='focus:bg-innercontainer'>Negative</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <small className='text-textsecondary max-w-[25rem]'>
              {challengeInfo.challengeType === "Normal" ? "Normal challenges will be used once each, and will go into the normal challenge pool. These could be challenges done during hikes, in the city, etc." : ""}
              {challengeInfo.challengeType === "Daily" ? "Daily challenges will be available every day for everyone; ex. \'Wake up at 9am\'." : ""}
              {challengeInfo.challengeType === "Negative" ? "Negative challenges will be available every day and deduct points; ex. \'Smell bad\'." : ""}
            </small>
          </div>
          <button
            className={` ${loading ? "bg-buttondisabled" : "bg-accent hover:bg-buttonhover"} px-4 py-2 rounded-lg transition-colors cursor-pointer`}
            onClick={handleSubmit}
            disabled={loading}
          >
            Submit
          </button>
          <small className='text-textsecondary max-w-[25rem]'>Note: The point value for each challenge will be determined by the group as challenges are received.</small>
        </div>
      </div>
    </AuthProvider>
  )
}

export default Form