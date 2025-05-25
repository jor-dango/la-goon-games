'use client'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { Challenge } from '@/lib/types';

const NUM_DAYS = 8;

function Debug() {
  const [normalChallenges, setNormalChallenges] = useState<Challenge[]>();
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>();
  const [negativeChallenges, setNegativeChallenges] = useState<Challenge[]>();
  const [numChallenges, setNumChallenges] = useState(0);

  const [currentNormalChallenges, setCurrentNormalChallenges] = useState<Challenge[]>();
  const [currentDailyChallenges, setCurrentDailyChallenges] = useState<Challenge[]>();
  const [currentNegativeChallenges, setCurrentNegativeChallenges] = useState<Challenge[]>();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getChallengeBank();
    getCurrentChallenges();
  }, [])

  async function getChallengeBank() {
    
    const unsub = onSnapshot(collection(db, "challengeBank"), (collection) => {
      const normalChallenges: Challenge[] = [];
      const dailyChallenges: Challenge[] = [];
      const negativeChallenges: Challenge[] = [];
      collection.forEach((document) => {
        const data = document.data() as Challenge;
        if (data.challengeType === "Normal") {
          normalChallenges.push(data);
        }
        else if (data.challengeType === "Daily") {
          dailyChallenges.push(data);
        }
        else if (data.challengeType === "Negative") {
          negativeChallenges.push(data);
        }
        // console.log(data);
      })
      setNormalChallenges(normalChallenges);
      setDailyChallenges(dailyChallenges);
      setNegativeChallenges(negativeChallenges);
      console.log("negative", negativeChallenges)
      console.log("daily", dailyChallenges)
      console.log("normal", normalChallenges)

      setNumChallenges(normalChallenges.length + dailyChallenges.length + negativeChallenges.length);
      // console.log(normalChallenges.length, dailyChallenges.length, negativeChallenges.length)
    });

  }

  async function getCurrentChallenges() {
    const unsub = onSnapshot(collection(db, "challenges"), (collection) => {
      const challenges: Challenge[] = [];

      collection.forEach((document) => {
        const data = document.data() as Challenge;
        challenges.push(data);
      });
      setCurrentNormalChallenges(challenges.filter((challenge) => challenge.challengeType === "Normal"));
      setCurrentDailyChallenges(challenges.filter((challenge) => challenge.challengeType === "Daily"));
      setCurrentNegativeChallenges(challenges.filter((challenge) => challenge.challengeType === "Negative"));
    });
  }

  async function populateDailyChallenges() {
    if (dailyChallenges) {
      dailyChallenges.forEach((challenge) => {
        if (!challenge.pulled) {
          setDoc(doc(db, "challenges", challenge.challengeID.toString()), {
            ...challenge,
            pulled: true
          });
          updateDoc(doc(db, "challengeBank", challenge.challengeID.toString()), {
            pulled: true
          });
        }
      })
    }
  }

  async function populateNegativeChallenges() {
    if (negativeChallenges) {
      negativeChallenges.forEach((challenge) => {
        if (!challenge.pulled) {
          setDoc(doc(db, "challenges", challenge.challengeID.toString()), {
            ...challenge,
            pulled: true
          });
          updateDoc(doc(db, "challengeBank", challenge.challengeID.toString()), {
            pulled: true
          });
        }
      })
    }
  }

  async function populateNormalChallenges(numMoreChallenges?: number) {
    if (normalChallenges) {
      const nonPulledNormalChallenges = normalChallenges.filter((challenge) => challenge.pulled === false);
      console.log(nonPulledNormalChallenges)
      if (nonPulledNormalChallenges.length === 0) {
        return;
      }

      const numChallengesToPopulate = numMoreChallenges || Math.floor(numChallenges / (NUM_DAYS + 2)) || 1; // ie. 1 is assigned if the second condition = 0 (which is falsy)
      console.log("num challenges", numChallenges);
      console.log("num challenges to pop", numChallengesToPopulate);
      for (let i = 0; i < numChallengesToPopulate; i++) { // Note that number of challenges may change
        const randIndex = Math.floor(nonPulledNormalChallenges.length * Math.random());

        const randNormalChallenge = await getDoc(doc(db, "challengeBank", nonPulledNormalChallenges[randIndex].challengeID.toString()));
        updateDoc(doc(db, "challengeBank", randNormalChallenge.id), {
          pulled: true
        })
        setDoc(doc(db, "challenges", randNormalChallenge.id), {
          ...randNormalChallenge.data(),
          pulled: true
        })
      }
    }
  }

  async function clearCurrentChallenges() {
    const docsSnap = await getDocs(collection(db, "challenges"));
    docsSnap.forEach((document) => {
      deleteDoc(doc(db, "challenges", document.id));
    })
  }

  // async function updateChallengeSchema() {
  //   let challenge: Challenge | null = null;
  //   const type = ["Normal", "Daily", "Negative"];
  //   const docSnaps = await getDocs(collection(db, "challengeBank"));
  //   docSnaps.forEach((document) => {
  //     challenge = document.data() as Challenge;
  //     setDoc(doc(db, "challengeBank", document.id), {
  //       author: challenge.author,
  //       challenge: challenge.challenge,
  //       challengeID: challenge.challengeID,
  //       challengeType: type[Math.floor(Math.random() * 2.999)],
  //       pulled: false,
  //       pointval: challenge.pointval,
  //       proposedpointval: challenge.proposedpointval,
  //       playersCompleted: challenge.playersCompleted
  //     });
  //   });
  // }

  async function unpullAllChallenges() {
    const docsSnap = await getDocs(collection(db, "challengeBank"));
    docsSnap.forEach((document) => {
      updateDoc(doc(db, "challengeBank", document.id), {
        pulled: false
      })
    })
  }

  async function duplicateChallenges() {
    const docsSnap = await getDocs(collection(db, "challengeBank"));
    docsSnap.forEach((document) => {
      setDoc(doc(db, "duplicateChallengeBank", document.id), {
        ...document.data()
      })
    }) 
  }

  async function vetoChallenge() {
    if (selectedChallenge) {
      console.log("deleted challenge ", selectedChallenge.challengeID);
      deleteDoc(doc(db, "challenges", selectedChallenge.challengeID.toString()));
      if (selectedChallenge.challengeType === "Normal") {
        populateNormalChallenges(1);
      }
      setSelectedChallenge(null);
      setShowModal(false);
    }
  }

  function ChallengeContainer({
    className,
    challenge,
  }: {
    className?: string;
    challenge: Challenge;
  }) {
    return (
      <div className={"flex flex-col rounded-2xl bg-bgmedium min-w-[70%] w-[70%] p-4 gap-4 border border-border " + className} >
        <p
          className="text-textlight"
          style={{ lineHeight: 1.2, fontSize: ".875rem" }}
        >
          {challenge.challenge}
        </p>
        <div className="flex flex-1" />
        <button
          className="px-4 py-2 bg-destructive rounded-lg w-full transition-colors hover:bg-red-700 active:bg-red-700"
          onClick={() => {
            setSelectedChallenge(challenge);
            setShowModal(true);
          }}
        >
          <small className='text-textlight'>Veto Challenge</small>
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 py-8'>
      <button
        onClick={() => {
          populateDailyChallenges();
          populateNegativeChallenges();
        }}
        className='px-4 py-2 bg-bglight rounded-lg w-fit'
      >
        Populate Daily/Negative Challenges
      </button>
      <button
        onClick={() => populateNormalChallenges()}
        className='px-4 py-2 bg-bglight rounded-lg w-fit'
      >
        Populate Normal Challenges
      </button>
      <button
        onClick={clearCurrentChallenges}
        className='px-4 py-2 bg-bglight rounded-lg w-fit'
      >
        Delete current challenges (ie. challenges collection)
      </button>

      <button
        onClick={unpullAllChallenges}
        className='px-4 py-2 bg-bglight rounded-lg w-fit'
      >
        Unpull all challenges
      </button>

      <button
        onClick={duplicateChallenges}
        className='px-4 py-2 bg-bglight rounded-lg w-fit'
      >
        Duplicate all challenges
      </button>




      <div className="pt-4 pb-3 bg-bgmedium w-full">
        <p className="text-textlight font-semibold ml-4">
          Today&apos;s Challenges
        </p>
        <div
          className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll"
          style={{ scrollbarWidth: "none" }}
        >
          {currentNormalChallenges?.map((challenge) => (
            <ChallengeContainer
              key={challenge.challengeID}
              className="bg-bgdark"
              challenge={challenge}
            />
          ))}
        </div>
      </div>

      <div className="pt-4 pb-3 w-full">
        <p className="text-textlight font-semibold ml-4">
          Daily Challenges
        </p>
        <div
          className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll"
          style={{ scrollbarWidth: "none" }}
        >
          {currentDailyChallenges?.map((challenge) => (
            <ChallengeContainer
              key={challenge.challengeID}
              challenge={challenge}
            />
          ))}
        </div>
      </div>

      <div className="pt-4 pb-3 w-full">
        <p className="text-textlight font-semibold ml-4">
          Negative Challenges
        </p>
        <div className="flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll">
          {currentNegativeChallenges?.map((challenge) => (
            <ChallengeContainer
              key={challenge.challengeID}
              challenge={challenge}
            />
          ))}
        </div>
      </div>


      {showModal && (
        <div
          className="fixed top-0 bg-bgdark/90 w-full h-[100vh] z-10 flex items-center justify-center-safe"
          onClick={() => {
            setShowModal(false);
            setSelectedChallenge(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bgmedium w-[90%] p-8 rounded-2xl space-y-4"
          >
            <p className="text-textlight mb-8">
              <strong>deaduzz??</strong>
            </p>
            <button
              className="px-4 py-2 bg-destructive rounded-lg w-full transition-colors hover:bg-red-700 active:bg-red-700"
              onClick={() => {
                vetoChallenge();
              }}
            >
              <small>yurr</small>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Debug