"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, app } from "../firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { AuthProvider } from "@/context/AuthProvider";
import { Challenge, UserInfo } from "@/lib/types";

function Form() {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeInfo, setChallengeInfo] = useState<Challenge>({
    author: "",
    challenge: "",
    challengeID: -1,
    challengeType: null,
    pulled: false,
    pointval: 0,
    proposedpointval: [],
    playersCompleted: [],
  });
  const [editTypes, setEditTypes] = useState<Record<number, string | null>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "metadata", "counters"), (doc) => {
      if (doc.exists() && doc.data() && "numChallenges" in doc.data()) {
        setChallengeInfo((prevState) => ({
          ...prevState,
          challengeID: doc.data().numChallenges,
        }));
      }
    });

    getUser();
  }, []);
  useEffect(() => {
    getUserInfo();
  }, [user]);
  useEffect(() => {
    getChallenges();
  }, [userInfo]); // I don't really like kthis chaining of useEffects but wtv mayn

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
      console.log("user: ", user);
    });
  }

  async function getUserInfo() {
    if (user) {
      console.log("uid: ", user.uid);
      const docSnap = await getDoc(doc(db, "players", user.uid));
      if (docSnap.exists()) {
        setUserInfo(docSnap.data() as UserInfo); // Claude got me right w this syntax, didn't know this was a thing in typescript
        setChallengeInfo((prevState) => ({
          ...prevState,
          author: docSnap.data().name,
        }));
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
        numChallenges: challengeInfo.challengeID + 1,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      window.alert("Challenge successfully submitted!");
      setChallengeInfo((prevState) => ({ ...prevState, challenge: "" }));
      setChallengeInfo((prevState) => ({ ...prevState, challengeType: null }));
    }
  }

  async function getChallenges() {
    const challenges: Challenge[] = [];
    const docsSnap = await getDocs(
      query(
        collection(db, "challengeBank"),
        where("author", "==", userInfo?.name)
      )
    );
    docsSnap.forEach((doc) => {
      challenges.push(doc.data() as Challenge);
    });
    setChallenges(challenges);
  }

  // Update challenge type in Firestore
  async function handleEditType(challengeID: number) {
    const newType = editTypes[challengeID];
    if (!newType) return;
    try {
      await updateDoc(doc(db, "challengeBank", challengeID.toString()), {
        challengeType: newType,
      });
      window.alert("Challenge type updated!");
    } catch (error) {
      console.error(error);
      window.alert("Failed to update challenge type.");
    }
  }

  return (
    <AuthProvider>
      <div
        className={`w-full h-[100vh] py-4 flex flex-col gap-8 items-center overflow-y-scroll ${
          showChallenges ? "justify-start" : "justify-center"
        }`}
      >
        {!showChallenges && (
          <div className="max-w-[95%] flex flex-col gap-8 p-8 border border-border rounded-2xl bg-bglight">
            {/* <button onClick={handleSignOut}>Log Out</button> */}
            <div>
              <small className="text-textsecondary">
                Welcome {userInfo?.name}!
              </small>
              <h3>Submit a Challenge</h3>
            </div>
            <small
              className={`${
                errorMsg ? "block" : "hidden"
              } ml-1 text-destructive`}
            >
              {errorMsg}
            </small>
            <div className="space-y-1">
              <p className="ml-1">Type in your challenge</p>
              <textarea
                value={challengeInfo.challenge}
                onChange={(e) =>
                  setChallengeInfo({
                    ...challengeInfo,
                    challenge: e.target.value,
                  })
                }
                required
                placeholder="Input your challenge"
                style={{
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  wordBreak: "break-word",
                }}
                className="px-4 py-2 h-20 w-[30rem] max-w-[80vw] border border-border text-textdark rounded-lg transition ease-in-out focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="ml-1">Select the type of challenge</p>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-fit">
                  <div className="px-4 py-2 flex flex-row gap-4 border border-border text-textdark rounded-lg transition ease-in-out focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer">
                    <p
                      className={`${
                        challengeInfo.challengeType ? "" : "text-textsecondary"
                      }`}
                    >
                      {challengeInfo.challengeType ?? "Select"}
                    </p>
                    <ChevronDown className="stroke-textsecondary" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      setChallengeInfo({
                        ...challengeInfo,
                        challengeType: "Normal",
                      })
                    }
                    className="focus:bg-innercontainer"
                  >
                    Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setChallengeInfo({
                        ...challengeInfo,
                        challengeType: "Daily",
                      })
                    }
                    className="focus:bg-innercontainer"
                  >
                    Daily
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setChallengeInfo({
                        ...challengeInfo,
                        challengeType: "Negative",
                      })
                    }
                    className="focus:bg-innercontainer"
                  >
                    Negative
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <small className="text-textsecondary max-w-[25rem]">
                {challengeInfo.challengeType === "Normal"
                  ? "Normal challenges will be used once each, and will go into the normal challenge pool. These could be challenges done during hikes, in the city, etc."
                  : ""}
                {challengeInfo.challengeType === "Daily"
                  ? "Daily challenges will be available every day for everyone; ex. 'Wake up at 9am'."
                  : ""}
                {challengeInfo.challengeType === "Negative"
                  ? "Negative challenges will be available every day and deduct points; ex. 'Smell bad'."
                  : ""}
              </small>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className={` ${
                  loading
                    ? "bg-buttondisabled"
                    : "bg-accent active:bg-buttonhover hover:bg-buttonhover"
                } px-4 py-2 rounded-lg transition-colors cursor-pointer`}
                onClick={handleSubmit}
                disabled={loading}
              >
                Submit
              </button>
              <button
                onClick={() => setShowChallenges(true)}
                className="rounded-lg px-4 py-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-300 transition-colors cursor-pointer"
              >
                See submitted challenges
              </button>
            </div>
            <small className="text-textsecondary max-w-[25rem]">
              Note: The point value for each challenge will be determined by the
              group as challenges are received.
            </small>
          </div>
        )}
        {showChallenges && (
          <div className="w-[30rem] max-w-[95%] flex flex-col p-4 gap-4 border border-border rounded-2xl bg-bglight">
            <button
              onClick={() => setShowChallenges(false)}
              className="flex flex-row items-center rounded-lg px-4 py-3 gap-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="stroke-textdark h-5" />
              Submit a challenge
            </button>
            {challenges.map((challenge) => (
              <div
                key={challenge.challengeID}
                className="min-w-full max-w-[95%] flex flex-col p-8 border border-border rounded-lg bg-bglight"
              >
                <p className="font-semibold">Challenge</p>
                <p>{challenge.challenge}</p>
                <br />
                <p className="font-semibold">Challenge Type</p>
                <p>{challenge.challengeType}</p>
                <div className="flex flex-col gap-1">
                  <p className="mt-6">Select the type of challenge</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-fit">
                      <div className="px-4 py-2 flex flex-row gap-4 border border-border text-textdark rounded-lg transition ease-in-out focus:outline-accent hover:shadow-lg hover:border-accent bg-innercontainer">
                        <p
                          className={`${
                            editTypes[challenge.challengeID]
                              ? ""
                              : "text-textsecondary"
                          }`}
                        >
                          {editTypes[challenge.challengeID] ??
                            challenge.challengeType ??
                            "Select"}
                        </p>
                        <ChevronDown className="stroke-textsecondary" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditTypes((prev) => ({
                            ...prev,
                            [challenge.challengeID]: "Normal",
                          }))
                        }
                        className="focus:bg-innercontainer"
                      >
                        Normal
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditTypes((prev) => ({
                            ...prev,
                            [challenge.challengeID]: "Daily",
                          }))
                        }
                        className="focus:bg-innercontainer"
                      >
                        Daily
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditTypes((prev) => ({
                            ...prev,
                            [challenge.challengeID]: "Negative",
                          }))
                        }
                        className="focus:bg-innercontainer"
                      >
                        Negative
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <small className="text-textsecondary max-w-[25rem]">
                    {editTypes[challenge.challengeID] === "Normal"
                      ? "Normal challenges will be used once each, and will go into the normal challenge pool. These could be challenges done during hikes, in the city, etc."
                      : ""}
                    {editTypes[challenge.challengeID] === "Daily"
                      ? "Daily challenges will be available every day for everyone; ex. 'Wake up at 9am'."
                      : ""}
                    {editTypes[challenge.challengeID] === "Negative"
                      ? "Negative challenges will be available every day and deduct points; ex. 'Smell bad'."
                      : ""}
                  </small>
                </div>
                <button
                  className="bg-accent active:bg-buttonhover hover:bg-buttonhover
                 px-4 py-2 mt-4 rounded-lg transition-colors cursor-pointer"
                  onClick={() => handleEditType(challenge.challengeID)}
                  disabled={!editTypes[challenge.challengeID]}
                >
                  Submit edited challenge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthProvider>
  );
}

export default Form;
