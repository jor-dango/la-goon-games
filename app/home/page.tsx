"use client";
import { AuthProvider } from "@/context/AuthProvider";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { Challenge, Team, UserInfo, TeamsDoc } from "@/lib/types";

function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [numPlayers, setNumPlayers] = useState(0);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [teamsDoc, setTeamsDoc] = useState<TeamsDoc>();
  const [team, setTeam] = useState<Team>();
  const [teamInfo, setTeamInfo] = useState<{
    points: number;
    names: string[];
  }>({ points: 0, names: [] });

  const [normalChallenges, setNormalChallenges] = useState<Challenge[]>();
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>();
  const [negativeChallenges, setNegativeChallenges] = useState<Challenge[]>();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showModal, setShowModal] = useState<"claim" | "vote" | "">("");

  useEffect(() => {
    getUser();
    getAllPlayers();
  }, []);
  useEffect(() => {
    async function getInfo() {
      try {
        await getUserInfo();
        await getTeam();
      } catch (error) {
        console.error(error);
      }
    }
    getInfo();
  }, [user]);
  useEffect(() => {
    async function parseTeam() {
      await parseTeamInfo();
      setLoading(false);
    }
    parseTeam();
  }, [team]);

  useEffect(() => {
    if (numPlayers !== 0) {
      getChallenges();
    }
  }, [numPlayers]);

  async function getUser() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }

  async function getAllPlayers() {
    const querySnapshot = await getDocs(collection(db, "players"));
    const map: Record<string, string> = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserInfo;
      map[doc.id] = data.name;
    });
    setPlayersMap(map);
  }

  async function getChallenges() {
    const unsub = onSnapshot(collection(db, "testChallenges"), (collection) => {
      const challenges: Challenge[] = [];
      collection.forEach((document) => {
        const data = document.data() as Challenge;
        if (data.proposedpointval) {
          const medianIndex = Math.floor(data.proposedpointval.length / 2);

          if (
            medianIndex > 0 &&
            data.proposedpointval[medianIndex].points &&
            data.proposedpointval[medianIndex].points !== data.pointval
          ) {
            updateDoc(doc(db, "testChallenges", document.id), {
              pointval: data.proposedpointval[medianIndex].points, // Update pointval to the median of the proposed values
            });
          }
        }
        challenges.push(document.data() as Challenge);
        console.log("challenges currently", challenges);
      });

      setNormalChallenges(
        challenges.filter((challenge) => challenge.challengeType === "Normal")
      );
      setDailyChallenges(
        challenges.filter((challenge) => challenge.challengeType === "Daily")
      );
      setNegativeChallenges(
        challenges.filter((challenge) => challenge.challengeType === "Negative")
      );
    });
  }

  async function getUserInfo() {
    if (user) {
      console.log("uid: ", user.uid);
      const docSnap = await getDoc(doc(db, "players", user.uid));
      if (docSnap.exists()) {
        setUserInfo(docSnap.data() as UserInfo);
      }
    }
  }

  async function getTeam() {
    let numPlayers = 0;

    const currentDate = new Date().getDate();
    const docsSnap = await getDocs(
      query(collection(db, "teams"), where("date", "==", currentDate - 1))
    ); /* This finds nothing if there isn't a teams doc already made for the given date */
    docsSnap.forEach((document) => { /* There will only be a single doc w the right date, so this only runs once */
      setTeamsDoc(document.data() as TeamsDoc);

      if (user) {
        const teams: Team[] = document.data().teams as Team[];
        for (const i in teams) {
          for (const j in teams[i].uuids) {
            numPlayers++;
            if (teams[i].uuids[j] === user.uid) {
              setTeam(teams[i]); // Find the team that the current user is in

              const unsub = onSnapshot(doc(db, "teams", document.id), (doc) => {
                // Get real-time data for the points of the current user's team
                if (doc.exists()) {
                  setTeamInfo((prev) => ({
                    ...prev,
                    points: doc.data().teams[i].points,
                  }));
                }
              });
            }
          }
        }
        setNumPlayers(numPlayers); // numPlayers is set here bc number of players playing does not necessarily equal the number of registered players
      }
    });
  }

  async function parseTeamInfo() {
    if (team) {
      const teamNames: string[] = [];
      for (let i = 0; i < team.uuids.length; i++) {
        const docSnap = await getDoc(doc(db, "players", team.uuids[i]));
        if (docSnap.exists()) {
          const data: UserInfo = docSnap.data() as UserInfo;
          teamNames.push(data.name);
        }
      }
      setTeamInfo((prev) => ({ ...prev, names: teamNames }));
    }
  }

  // const meow = { uuid: "XVQPNCALhXU6iPqIVb7mCOFX5ez1", points: 25 };
  // const ear = [meow];
  // async function addVoter() {
  //   // let challenge: Challenge | null = null;
  //   console.log("peow");
  //   const docSnap = await getDoc(doc(db, "testChallenges", "1"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data());
  //   updateDoc(doc(db, "testChallenges", "2"), {
  //     proposedpointval: [...challenge.proposedpointval, meow],
  //   });
  // }
  // async function updateChallengeSchema() {
  //   let challenge: Challenge | null = null;
  //   const docSnaps = await getDocs(collection(db, "testChallenges"));
  //   docSnaps.forEach((document) => {
  //     challenge = document.data() as Challenge;
  //     setDoc(doc(db, "testChallenges", document.id), {
  //       author: challenge.author,
  //       challenge: challenge.challenge,
  //       challengeID: challenge.challengeID,
  //       challengeType: challenge.challengeType,
  //       completed: challenge.completed,
  //       pointval: 0,
  //       proposedpointval: [],
  //       playersCompleted: []
  //     });
  //   });
  // }

  // const e = { uuid: "YacewnyggvNsvpQ0fh0pOJUNYGn1", points: 4 };
  // const ear = [e, e, e, e, e, e, e];
  // async function updateChallenge() {
  //   // let challenge: Challenge | null = null;
  //   console.log('peow')
  //   const docSnap = await getDoc(doc(db, "testChallenges", "0"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data())
  //   updateDoc(doc(db, "testChallenges", "0"), {
  //     author: challenge.author,
  //     challenge: challenge.challenge,
  //     challengeID: challenge.challengeID,
  //     challengeType: challenge.challengeType,
  //     completed: challenge.completed,
  //     pointval: 0,
  //     proposedpointval: [],
  //     playersCompleted: []
  //   });
  // }

  // async function addVoter() {
  //   // let challenge: Challenge | null = null;
  //   console.log('peow')
  //   const docSnap = await getDoc(doc(db, "testChallenges", "0"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data())
  //   updateDoc(doc(db, "testChallenges", "0"), {

  //     proposedpointval: [...challenge.proposedpointval, e]
  //   });
  // }

  function ChallengeContainer({
    className,
    challenge,
  }: {
    className?: string;
    challenge: Challenge;
  }) {
    return (
      <div
        className={
          "flex flex-col rounded-2xl bg-bgdark min-w-[70%] p-4 gap-4 " +
          className
        }
      >
        <p
          className="text-textlight"
          style={{ lineHeight: 1.2, fontSize: ".875rem" }}
        >
          {challenge.challenge}
        </p>
        <div className="flex flex-1" />
        <p
          className="text-textlight"
          style={{ lineHeight: 1.2, fontSize: ".875rem" }}
        >
          <strong>
            {/* If every user has submitted */}
            {challenge.proposedpointval &&
              challenge.proposedpointval.length >= numPlayers
              ? "Final Points: " + challenge.pointval
              : // else if the user has submitted a point value
              challenge.proposedpointval &&
                challenge.proposedpointval.some((p) => p.uuid === user?.uid)
                ? "Projected Points: " + challenge.pointval
                : // else (user has not submited a point value)
                "Projected Points: Hidden"}
          </strong>
        </p>
        {challenge.proposedpointval &&
          challenge.proposedpointval.length >= numPlayers ? (
          <button
            className="px-4 py-2 bg-accent rounded-lg w-full transition-colors hover:bg-buttonhover active:bg-buttonhover"
            onClick={() => {
              setSelectedChallenge(challenge);
              setShowModal("claim");
            }}
          >
            <small>Claim Challenge</small>
          </button>
        ) : challenge.proposedpointval &&
          challenge.proposedpointval.some((p) => p.uuid === user?.uid) ? (
          <button
            className="px-4 py-2 bg-bglight rounded-lg w-full transition-colors hover:bg-[#aaa] active:bg-[#aaa]"
            onClick={() => {
              setSelectedChallenge(challenge);
              setShowModal("vote");
            }}
          >
            <small>Change your vote</small>
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-bglight rounded-lg w-full transition-colors hover:bg-[#aaa] active:bg-[#aaa]"
            onClick={() => {
              setSelectedChallenge(challenge);
              setShowModal("vote");
            }}
          >
            <small>Vote for point value</small>
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <AuthProvider>
        <div className="flex justify-center items-center w-full min-h-[100vh]">
          <p className="text-textlight">Loading...</p>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="w-full min-h-[100vh] overflow-y-scroll">
        {/* Top part w the score */}
        <div className="fixed flex flex-col h-[35vh] w-full justify-center items-center -z-10">
          <p
            className="text-textsecondary"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            your team has earned
          </p>
          <h1 className="text-textlight font-medium">{teamInfo?.points}</h1>
          <p
            className="text-textsecondary"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            points today
          </p>
        </div>

        {/* Bottom part */}
        <div className="flex flex-col mt-[35vh] rounded-t-3xl bg-bgmedium w-full py-5 gap-6 shadow-[0px_-5px_50px_rgba(15,15,15,80%)]">
          <div className="flex flex-col items-center w-full">
            <small className="text-textsecondary">Your Team</small>
            <p className="text-textlight">
              {teamInfo?.names.map((name, idx) => (
                <span key={idx}>{name},&nbsp;</span>
              ))}
            </p>
          </div>

          <div className="pt-4 pb-3 bg-bgdark">
            <p className="text-textlight font-semibold ml-4">
              Today&apos;s Challenges
            </p>
            <div
              className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll"
              style={{ scrollbarWidth: "none" }}
            >
              {normalChallenges?.map((challenge) => (
                <ChallengeContainer
                  key={challenge.challengeID}
                  className="bg-bgmedium"
                  challenge={challenge}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 pb-3">
            <p className="text-textlight font-semibold ml-4">
              Daily Challenges
            </p>
            <div
              className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll"
              style={{ scrollbarWidth: "none" }}
            >
              {dailyChallenges?.map((challenge) => (
                <ChallengeContainer
                  key={challenge.challengeID}
                  challenge={challenge}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 pb-3">
            <p className="text-textlight font-semibold ml-4">
              Negative Challenges
            </p>
            <div className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll">
              {negativeChallenges?.map((challenge) => (
                <ChallengeContainer
                  key={challenge.challengeID}
                  challenge={challenge}
                />
              ))}
            </div>
          </div>
        </div>



      </div>

      {/* CLaim Challenge Modal */}
      {showModal === "claim" &&
        <div
          className="fixed top-0 bg-bgdark/90 w-full h-[100vh] z-10 flex items-center justify-center-safe"
          onClick={() => {
            setShowModal("");
            setSelectedChallenge(null);
          }}
        >
          <div className="bg-bgmedium max-w-[90%] p-8 rounded-2xl">

          </div>
        </div>
      }

      {/* Vote on points Modal */}
      {showModal === "vote" &&
        <div
          className="fixed top-0 bg-bgdark/90 w-full h-[100vh] z-10 flex items-center justify-center-safe"
          onClick={() => {
            setShowModal("");
            setSelectedChallenge(null);
          }}
        >
          <div className="bg-bgmedium max-w-[90%] p-8 rounded-2xl">

          </div>
        </div>
      }
    </AuthProvider>
  );
}

export default Home;
