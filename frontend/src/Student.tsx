import React, { useEffect, useState,useMemo } from 'react'
import CryptoJS from 'crypto-js'
import { Octokit } from 'octokit'
import { useLocation } from 'react-router'

import { useSessionCache } from './utils/useSessionCache'
import MultiSelect from './components/MultiSelect'

const Student: React.FC = () => {
  const secret = import.meta.env.VITE_SECRET_KEY
  const encryptedToken = localStorage.getItem('encryptedToken')
  const [rowID,setRowID] = useState(0)
  // state
  const [octokit, setOctokit] = useState<Octokit | null>(null)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<any[]>([])
  const [totalClassroom, setTotalClassroom] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalPassed, setTotalPassed] = useState(0);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([])
  const [selectedOrder, setSelectedOrder] = useState<'asc'|'dsc'>('asc')


  // read username filter from link state
  const { state } = useLocation()
  const filterName: string | undefined = state?.participantName
  const result = state?.result

 
  const sortOptions = [
    { label: 'Assignment',    value: 'assignment'    },
    { label: 'Classroom',     value: 'classroom'     },
    { label: 'Commits',       value: 'commit_count'  },
    { label: 'Grade',         value: 'grade'         },
    { label: 'Private Grade', value: 'privateGrade'  },
  ]

  // decrypt token & instantiate Octokit once
  useEffect(() => {
    if (!encryptedToken || !secret) return
    const bytes = CryptoJS.AES.decrypt(encryptedToken, secret)
    const token = bytes.toString(CryptoJS.enc.Utf8)
    if (token) setOctokit(new Octokit({ auth: JSON.parse(token) }))
  }, [encryptedToken, secret])

  // function: fetch all classrooms, assignments, and filtered participants
const fetchAllData = async (username?: string) => {
  setLoading(true);
  if (!octokit) return [];


  const getParts = async (assignmentId: number) =>
    useSessionCache(
      `gh:parts:${assignmentId}:${username ?? 'all'}`,        // unique key
      async () => {
        const { data } = await octokit.request(
          'GET /assignments/{assignment_id}/accepted_assignments',
          { assignment_id: assignmentId, per_page: 100 }
        );
        return username
          ? data.filter(p => p.students?.[0]?.login === username)
          : data;
      },
      10 * 60_000                                    
    );


  const classrooms = await useSessionCache(
    'gh:classrooms',
    () => octokit.request('GET /classrooms').then(r => r.data)
  );


  const nested = await Promise.all(
    classrooms.map(async (c: any) => {
      const assignments = await useSessionCache(
        `gh:assign:${c.id}`,
        () =>
          octokit
            .request('GET /classrooms/{classroom_id}/assignments', {
              classroom_id: c.id
            })
            .then(r => r.data)
      );

      const assignmentsWithParts = await Promise.all(
        assignments.map(async (a: any) => ({
          ...a,
          participants: await getParts(a.id)
        }))
      );

      return { ...c, assignments: assignmentsWithParts };
    })
  );


  const flat = username
    ? nested.flatMap(c => c.assignments).flatMap(a => a.participants)
    : [];

  const uniqueClassroom = [...new Set(flat.map(p => p.assignment.classroom.name))];
  const assignmentCount = flat.map(p => p.assignment.title).length;
  const passedCount     = flat.filter(p => p.grade === '100/100').length;

  setParticipants(flat);
  setTotalClassroom(uniqueClassroom.length);
  setTotalAssignments(assignmentCount);
  setTotalPassed(passedCount);
  setLoading(false);
  

  return nested;           
};

  useEffect(() => {
    if (!octokit) return
    fetchAllData(filterName).then(setClassrooms)
  }, [octokit, filterName])


  const sortedParticipants = useMemo(() => {
  if (selectedSorts.length === 0) return participants

  return [...participants].sort((a, b) => {
    for (const key of selectedSorts) {
      let aVal: string|number = 0, bVal: string|number = 0

      switch (key) {
        case 'assignment':
          aVal = a.assignment.title.toLowerCase()
          bVal = b.assignment.title.toLowerCase()
          break

        case 'classroom':
          aVal = a.assignment.classroom.name.toLowerCase()
          bVal = b.assignment.classroom.name.toLowerCase()
          break

        case 'commit_count':
          aVal = a.commit_count ?? 0
          bVal = b.commit_count ?? 0
          break

        case 'grade':
          // treat null as "0/100"
          aVal = parseInt((a.grade ?? '0/100').split('/')[0], 10)
          bVal = parseInt((b.grade ?? '0/100').split('/')[0], 10)
          break

        case 'privateGrade': {
          const rA = result.find(r => r.repo === a.repository.name)
          const rB = result.find(r => r.repo === b.repository.name)
          aVal = rA && rA.total>0 ? rA.passed/rA.total : 0
          bVal = rB && rB.total>0 ? rB.passed/rB.total : 0
          break
        }
      }

      if (aVal < bVal) return selectedOrder==='asc' ? -1 : 1
      if (aVal > bVal) return selectedOrder==='asc' ?  1 : -1
      // equal → continue to next key
    }
    return 0
  })
}, [participants, selectedSorts, selectedOrder, result])

 
  return (

  <div className="overflow-auto p-12 font-sans font-light ">
    <h1 className='text-5xl mb-4'>Student Management</h1>


    <a className='flex items-center gap-2 mb-2' href={state.participantLink}>
      <img className="w-16 h-16 rounded-full" src={state.participantAvatar} alt="" />
      <h1  className="text-3xl font-bold ">{filterName}</h1>
    </a>


    <div className='flex rounded-md '>
      <div className='flex gap-x-[20px]  '>
      <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Classroms Appeared In 
        </span>
         <span className='text-5xl'>
         {totalClassroom}
         </span>
      </div>
          <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Assignments Attempted
        </span>
         <span className='text-5xl'>
         {totalAssignments}
         </span>
      </div>
      <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Assignments passed
        </span>
         <span className='text-5xl'>
         {totalPassed}
         </span>
      </div>
        <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Assignments Failed
        </span>
         <span className='text-5xl'>
         {totalAssignments - totalPassed}
         </span>
      </div>
      
      </div>
    </div>

    <div className="flex items-center gap-4 mb-4">
  <MultiSelect
    options={sortOptions}
    selectedValues={selectedSorts}
    onChange={setSelectedSorts}
    placeholder="Sort by…"
  />
  <select
    value={selectedOrder}
    onChange={e => setSelectedOrder(e.target.value as 'asc'|'dsc')}
    className="border rounded p-1"
  >
    <option value="asc">ASC</option>
    <option value="dsc">DESC</option>
  </select>
  <button
    onClick={() => setSelectedSorts([])}
    className="border rounded px-2 py-1"
  >
    Clear Sort
  </button>
</div>
{!loading ? 
  <table className="min-w-full border">
    <thead className="bg-[#f1760d] ">
      <tr>
        <th className="p-2 border">Student</th>
        <th className="p-2 border">Assignment</th>
        <th className="p-2 border">Classroom</th>
        <th className="p-2 border">Commit Count</th>
        <th className="p-2 border">Grade</th>
        <th className="p-2 border">Private Test Grade</th>
      </tr>
    </thead>

    <tbody>
      {sortedParticipants.map((p) => {
        // every `p` is one of your objects
        const student = p.students[0]  // you only have one student per entry
        const { assignment, commit_count, grade, repository } = p
        return (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="p-2 border">{student.login}</td>
            <td className="p-2 border">
                <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#f1760d]"
              >
                 {assignment.title}
              </a>
            </td>
            <td className="p-2 border">{assignment.classroom.name}</td>
            <td className="p-2 border text-center">{commit_count}</td>
            <td className="p-2 border text-center">{grade ? grade : "FAIL"}</td>
   
            <td className="p-2 border text-center">
               {result.length > 0 && result[0].repo === repository.name ? (
                 <div className='flex gap-2 justify-center'>
                   {result[0].passed * 100}/{result[0].total * 100}
                      <a
                        href={`http://localhost:3000/outputs/${result[0].url.replace('/download/', '/')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View private-test log"
                        className="hover:opacity-70"
                            >
                             <svg width="24" height="24" viewBox="0 0 24 24">
                                <path
                                  d="M12 4c-5 0-9.27 3.11-11 8
                                    1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
                                  fill="currentColor"
                                />
                      </svg>
                  </a>
                 </div>
               ) : (
                 grade !== "100/100"
                   ? "NA"
                   : "Test Data not available"
               )}
            </td>
          
              
          </tr>
        )
      })}
    </tbody>
  </table>
  :"Please wait while the app fetches your data..."}
  </div>

  )
}

export default Student
