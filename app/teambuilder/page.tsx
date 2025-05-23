"use client";
import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  setDoc,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { Day, Team, TeamsDoc, UserInfo } from "@/lib/types";

// query each player
const querySnapshot = await getDocs(collection(db, "players"));
// add a new doc for the new 3 teams
const players: string[] = [];
querySnapshot.forEach((doc) => {
  // doc.data() is never undefined for query doc snapshots
  players.push(doc.id);
});
console.log(players);

async function randomizeTeam() {
  const playerCopy = [...players];
  const teamSize = 3;
  const teamDoc: TeamsDoc = {
    date: new Date().getUTCDate() as Day,
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
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [allTeams, setAllTeams] = useState<string[][]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});

  // Fetch all players and build a map of uuid -> name
  useEffect(() => {
    async function fetchPlayers() {
      const querySnapshot = await getDocs(collection(db, "players"));
      const map: Record<string, string> = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserInfo;
        map[doc.id] = data.name;
      });
      setPlayersMap(map);
    }
    fetchPlayers();
  }, []);

  // Fetch all teams and select today's or previous day's teams
  useEffect(() => {
    async function fetchTeams() {
      const querySnapshot = await getDocs(collection(db, "teams"));
      let teamsDocs: TeamsDoc[] = [];
      querySnapshot.forEach((doc) => {
        teamsDocs.push(doc.data() as TeamsDoc);
      });

      // Get today's and previous day's date (as your Day type)
      const todayDay = new Date().getUTCDate();
      const prevDay = todayDay - 1;

      // Try to find today's teams, else previous day's
      let selected: TeamsDoc | undefined =
        teamsDocs.find((t) => t.date === todayDay) ||
        teamsDocs.find((t) => t.date === prevDay);

      if (selected && Array.isArray(selected.teams)) {
        // For each team, map uuids to names
        const teamsWithNames: string[][] = selected.teams.map((team) =>
          team.uuids.map((uuid) => playersMap[uuid] || uuid)
        );
        setAllTeams(teamsWithNames);
      } else {
        setAllTeams([]);
      }
    }
    if (Object.keys(playersMap).length > 0) {
      fetchTeams();
    }
  }, [playersMap]);

  return (
    <div className="text-textlight">
      <div className="bg-[#2d2e2f] py-12 px-16 mb-4 mt-8 mx-auto w-fit flex flex-col gap-6 rounded-lg">
        <h2 className="text-textlight text-center"> Team Builder</h2>
        <button
          className="bg-[#6663A6] text-white flex mx-auto justify-center p-2 rounded"
          onClick={async () => {
            await randomizeTeam();
          }}
        >
          Randomize Teams
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center">
        {allTeams.map((team, idx) => (
          <Card key={idx} teamName={`Team ${idx + 1}`} teamNames={team} />
        ))}
      </div>
    </div>
  );
}
export default Page;

function Card(props: { teamName: string; teamNames: string[] | string }) {
  return (
    <div className="bg-[#2D2E2F] text-textlight rounded-lg py-12 px-4 gap-4 m-4 w-64 flex flex-col items-center justify-center">
      <h3 className="text-textlight ">{props.teamName}</h3>
      <div className="flex flex-col items-center justify-center">
        <p>{props.teamNames[0]}</p>
        <p>{props.teamNames[1]}</p>
        <p>{props.teamNames[2]}</p>
      </div>
    </div>
  );
}
