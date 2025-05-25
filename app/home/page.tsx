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
import { Slider } from "@/components/ui/slider";

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
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null
  );
  const [showModal, setShowModal] = useState<"claim" | "vote" | "">("");
  const [sliderVal, setSliderVal] = useState<number[]>([0]);

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

  async function getUserInfo() {
    if (user) {
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
      query(collection(db, "teams"), where("date", "==", currentDate))
    ); /* This finds nothing if there isn't a teams doc already made for the given date */
    docsSnap.forEach((document) => {
      /* There will only be a single doc w the right date, so this only runs once */
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
  // Separate function to update median points (call this when votes change)
  async function updateChallengeMedian(challengeId: string, votes: {uuid: string, points: number}[]) {
    if (!Array.isArray(votes) || votes.length === 0) return;

    const sortedVotes = [...votes].sort((a, b) => a.points - b.points);
    let medianPoints: number;
    const mid = Math.floor(sortedVotes.length / 2);

    if (sortedVotes.length % 2 === 0) {
      medianPoints = Math.round(
        (sortedVotes[mid - 1].points + sortedVotes[mid].points) / 2
      );
    } else {
      medianPoints = sortedVotes[mid].points;
    }

    // Get current document to check if update is needed
    const docSnap = await getDoc(doc(db, "challenges", challengeId));
    if (docSnap.exists()) {
      const currentData = docSnap.data() as Challenge;
      if (currentData.pointval !== medianPoints) {
        await updateDoc(doc(db, "challenges", challengeId), {
          pointval: medianPoints,
        });
      }
    }
  }

  // Clean listener function that only reads data
  async function getChallenges() {
    const unsub = onSnapshot(collection(db, "challenges"), (collection) => {
      const challenges: Challenge[] = [];

      collection.forEach((document) => {
        const data = document.data() as Challenge;
        challenges.push(data);
      });

      console.log("challenges currently", challenges);

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

  // Call updateChallengeMedian only when votes are submitted, not in the listener
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

  async function claimChallenge(uuid: string) {
    if (selectedChallenge) {
      updateDoc(doc(db, "challenges", selectedChallenge.challengeID.toString()), {
        playersCompleted: [...selectedChallenge.playersCompleted, uuid]
      })

      if (teamsDoc) {
        const currentTeamsDoc = teamsDoc;
        for (const i in currentTeamsDoc.teams) {
          if (currentTeamsDoc.teams[i].uuids.some((id) => id === uuid)) {
            currentTeamsDoc.teams[i].points += selectedChallenge.pointval;
            break;
          }
        }
        const currentDate = new Date().getDate();
        const docsSnap = await getDocs(query(collection(db, "teams"), where("date", "==", currentDate)));
        docsSnap.forEach((document) => {
          updateDoc(doc(db, "teams", document.id), {
            teams: currentTeamsDoc.teams
          })
        })
      }
      else {
        alert("Your team could not be found. Please close the claim window and try again.");
      }



      alert(`Challenge claimed for ${playersMap[uuid]}!`)
      setSelectedChallenge(null);
      setShowModal("");
    }
    else {
      alert("An error occurred. Please close the claim window and try again.");
    }
  }

  // const meow = { uuid: "XVQPNCALhXU6iPqIVb7mCOFX5ez1", points: 25 };
  // const ear = [meow];
  // async function addVoter() {
  //   // let challenge: Challenge | null = null;
  //   console.log("peow");
  //   const docSnap = await getDoc(doc(db, "challenges", "1"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data());
  //   updateDoc(doc(db, "challenges", "2"), {
  //     proposedpointval: [...challenge.proposedpointval, meow],
  //   });
  // }
  // async function updateChallengeSchema() {
  //   let challenge: Challenge | null = null;
  //   const docSnaps = await getDocs(collection(db, "challenges"));
  //   docSnaps.forEach((document) => {
  //     challenge = document.data() as Challenge;
  //     setDoc(doc(db, "challenges", document.id), {
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
  //   const docSnap = await getDoc(doc(db, "challenges", "0"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data())
  //   updateDoc(doc(db, "challenges", "0"), {
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
  //   const docSnap = await getDoc(doc(db, "challenges", "0"));
  //   const challenge = docSnap.data() as Challenge;
  //   console.log(docSnap.data())
  //   updateDoc(doc(db, "challenges", "0"), {

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
      {showModal === "claim" && (
        <div
          className="fixed top-0 bg-bgdark/90 w-full h-[100vh] z-10 flex items-center justify-center-safe"
          onClick={() => {
            setShowModal("");
            setSelectedChallenge(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bgmedium w-[90%] p-8 rounded-2xl space-y-4"
          >
            <p className="text-textlight mb-8">
              <strong>Claim points for:</strong>
            </p>
            {Object.entries(playersMap).map(([uuid, name]) => (
              <div key={uuid} className="flex justify-between gap-8">
                <p className="text-textlight">
                  {name}
                </p>
                <button
                  className={`${selectedChallenge?.playersCompleted.some((person) => person === uuid) ? "bg-buttondisabled/60" : "bg-bglight hover:bg-accent active:bg-accent"} px-4 py-2 rounded-lg transition-colors`}
                  onClick={() => claimChallenge(uuid)}
                  disabled={selectedChallenge?.playersCompleted.some((person) => person === uuid)}
                >
                  {selectedChallenge?.playersCompleted.some((person) => person === uuid) ? "Claimed" : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote on points Modal */}
      {showModal === "vote" && (
        <div
          className="fixed top-0 bg-bgdark/90 w-full h-[100vh] z-10 flex items-center justify-center-safe"
          onClick={() => {
            setShowModal("");
            setSelectedChallenge(null);
            setSliderVal([0]);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bgmedium max-w-[90%] w-[400px] h-[200px] p-8 rounded-2xl"
          >
            <div className="flex flex-col items-center justify-center mx-auto">
              <h2 className="text-textlight">{sliderVal}</h2>
            </div>
            <Slider
              defaultValue={[0]}
              max={100}
              step={5}
              min={0}
              onValueChange={(value) => {
                setSliderVal(value);
              }}
              className="z-10 w-full h-24"
              onValueCommit={async (value) => {
                if (selectedChallenge) {
                  const proposedValue = {
                    uuid: user?.uid || "",
                    points: value[0],
                  };

                  // Check if user has already voted
                  const existingVotes =
                    selectedChallenge.proposedpointval || [];
                  const userVoteIndex = existingVotes.findIndex(
                    (vote) => vote.uuid === user?.uid
                  );

                  let updatedVotes;
                  if (userVoteIndex !== -1) {
                    // User has already voted, update their vote
                    updatedVotes = [...existingVotes];
                    updatedVotes[userVoteIndex] = proposedValue;
                  } else {
                    // User has not voted, add new vote
                    updatedVotes = [...existingVotes, proposedValue];
                  }

                  try {
                    // First update the votes
                    await updateDoc(
                      doc(
                        db,
                        "challenges",
                        selectedChallenge.challengeID.toString()
                      ),
                      {
                        proposedpointval: updatedVotes,
                      }
                    );

                    // Then update the median - this is the key addition!
                    await updateChallengeMedian(
                      selectedChallenge.challengeID.toString(),
                      updatedVotes
                    );

                    // Close modal
                  } catch (error) {
                    console.error("Error updating vote:", error);
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </AuthProvider>
  );
}

export default Home;
