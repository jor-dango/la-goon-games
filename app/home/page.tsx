'use client'
import { AuthProvider } from '@/context/AuthProvider'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import { db } from '../firebase';
import { Team, UserInfo } from '@/lib/types';

function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [team, setTeam] = useState<Team>();
  const [teamInfo, setTeamInfo] = useState<{
    points: number;
    names: string[];
  }>();

  useEffect(() => {
    getUser();
  }, []);
  useEffect(() => {
    async function getInfo() {
      try {
        await getUserInfo();
        await getTeam();
      }
      catch (error) {
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
  }, [team])

  async function getUser() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }

  async function getUserInfo() {
    if (user) {
      console.log("uid: ", user.uid)
      const docSnap = await getDoc(doc(db, "players", user.uid));
      if (docSnap.exists()) {
        setUserInfo(docSnap.data() as UserInfo);
      }
    }
  }

  async function getTeam() {

    const currentDate = new Date().getUTCDate();
    const docsSnap = await getDocs(query(collection(db, "teams"), where("date", '==', currentDate - 2))); /* This will be a single doc */ /* This also doesn't work if there isn't a teams doc already made for the given date */
    docsSnap.forEach((doc) => {
      if (user) {
        const teams: Team[] = doc.data().teams as Team[];
        for (const i in teams) {
          for (const j in teams[i].uuids) {
            if (teams[i].uuids[j] === user.uid) {
              setTeam(teams[i]);
              break;
            }
          }
        }
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
      setTeamInfo({ points: team.points, names: teamNames });

    }
  }

  if (loading) {
    return (
      <AuthProvider>
        <div className='flex justify-center items-center w-full min-h-[100vh]'>
          <p className='text-textlight'>
            Loading...
          </p>
        </div>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <div className='w-full min-h-[100vh] overflow-y-scroll'>
        
        {/* Top part w the score */}
        <div className='fixed flex flex-col h-[35vh] w-full justify-center items-center -z-10'>
          <p className='text-textsecondary' style={{ fontFamily: "var(--font-dm-mono)" }}>
            your team has earned
          </p>
          <h1 className='text-textlight font-medium'>{team?.points}</h1>
          <p className='text-textsecondary' style={{ fontFamily: "var(--font-dm-mono)" }}>
            points today
          </p>
        </div>


        {/* Bottom part */}
        <div className='flex flex-col mt-[35vh] rounded-t-3xl bg-bgmedium w-full py-5 gap-6 shadow-[0px_-5px_50px_rgba(15,15,15,80%)]'>
          <div className='flex flex-col items-center w-full'>
            <small className='text-textsecondary'>Your Team</small>
            <p className='text-textlight'>
              {teamInfo?.names.map((index) => (
                <span key={index}>
                  {index},&nbsp;
                </span>
              ))}
            </p>
          </div>

          <div className='pt-4 pb-3 bg-bgdark'>
            <p className='text-textlight font-semibold ml-4'>
              Today's Challenges
            </p>
            <div className='flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll' style={{ scrollbarWidth: 'none' }}>
              <ChallengeContainer className='bg-bgmedium' />
              <ChallengeContainer className='bg-bgmedium' />
            </div>
          </div>

          <div className='pt-4 pb-3'>
            <p className='text-textlight font-semibold ml-4'>
              Daily Challenges
            </p>
            <div className='flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll' style={{ scrollbarWidth: 'none' }}>
              <ChallengeContainer />
              <ChallengeContainer />
            </div>
          </div>

          <div className='pt-4 pb-3'>
            <p className='text-textlight font-semibold ml-4'>
              Negative Challenges
            </p>
            <div className='flex flex-row px-4 py-2 gap-4 w-full overflow-x-scroll'>
              <ChallengeContainer />
              <ChallengeContainer />
            </div>
          </div>
        </div>

      </div>
    </AuthProvider>
  )
}

export default Home



function ChallengeContainer({ className }: { className?: string }) {
  return (
    <div className={'rounded-2xl bg-bgdark min-w-[70%] p-4 space-y-4 ' + className}>
      <p className='text-textlight' style={{ lineHeight: 1.2, fontSize: ".875rem" }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam
      </p>
      <p className='text-textlight' style={{ lineHeight: 1.2, fontSize: ".875rem" }}>
        <strong>Points: Undecided</strong>
      </p>
      <button className='px-4 py-2 bg-bglight rounded-lg w-full transition-colors hover:bg-[#aaa] active:bg-[#aaa]'>
        <small>Vote for point value</small>
      </button>
    </div>
  )
}