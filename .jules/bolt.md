## 2024-05-30 - Optimize StudentProposals
**Learning:** `StudentProposals.tsx` was doing an unnecessary API call using `trpc.getTopicAreas.useQuery()` just to get topic areas and group proposals. It can just iterate through `data` once and extract all active topic areas, which avoids a round-trip network request and prevents a loading state flash.
**Action:** Found a performance win by avoiding an unneeded API call.
