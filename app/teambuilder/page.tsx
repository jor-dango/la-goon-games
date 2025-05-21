"use client";
import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { Team, TeamsDoc } from "@/lib/types";

// query each player
const querySnapshot = await getDocs(collection(db, "players"));
// add a new doc for the new 3 teams
const players: string[] = [];
querySnapshot.forEach((doc) => {
  // doc.data() is never undefined for query doc snapshots
  players.push(doc.id);
  console.log(doc.id, " => ", doc.data());
});
console.log(players);

async function randomizeTeam() {
  const playerCopy = [...players];
  const teamSize = 3;
  const teamDoc: TeamsDoc = {
    date: new Date().getUTCDate(),
    teams: [],
  };
  for (let i = 0; i < 3; i++) {
    const tempTeam: Team = {
      points: 0,
      uuids: [],
    };
    for (let j = 0; j < teamSize; j++) {
      const randomIndex = Math.floor(Math.random() * playerCopy.length);
      const player = playerCopy[randomIndex];
      tempTeam.uuids[j] = player;
      playerCopy.splice(randomIndex, 1);
      if (playerCopy.length === 0) {
        if (j < teamSize - 1) {
          tempTeam.uuids[j + 1] = "";
          j += teamSize;
        }
      }
    }
    teamDoc.teams.push(tempTeam);
  }
  const docRef = await addDoc(collection(db, "teams"), {
    date: teamDoc.date,
    teams: teamDoc.teams,
  });
}

function Page() {
  const [team, setTeam] = useState<TeamsDoc[]>([]);
  const currentDate = new Date().getUTCDate();
  console.log(currentDate);

  return (
    <div>
      <h1 className="text-textlight"> Team Builder</h1>
      <button
        className="bg-blue-500 text-white p-2 rounded"
        onClick={async () => {
          await randomizeTeam();
          console.log("Teams randomized");
        }}
      >
        Randomize Teams
      </button>
      <div className="flex flex-col gap-4"></div>{" "}
    </div>
  );
}
export default Page;
