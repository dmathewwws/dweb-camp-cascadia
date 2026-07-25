/**
 * The camp interest tag list ("roots"), shared verbatim between the client
 * (check-in picker, directory filters) and the server (check-in validation).
 * Tag identity is the exact lowercase string — client picks and server
 * validation must agree byte-for-byte, so edit tags only here.
 */

export interface TagGroup {
  /** Section heading (Co-Adapt / Co-Create / Co-Here); set on the first group of a section */
  section?: string
  sectionSub?: string
  label: string
  tags: string[]
}

export const TAG_GROUPS: TagGroup[] = [
  {
    section: 'Co-Adapt',
    sectionSub: 'relationships & technology for resilience · care for each other and the land',
    label: 'open web & standards',
    tags: ['open standards', 'rss & feeds', 'activitypub & fediverse', 'at protocol & bluesky', 'nostr', 'matrix & chat', 'indieweb & small web', 'browsers & web platform'],
  },
  {
    label: 'infrastructure & protocols',
    tags: ['mesh networks', 'p2p protocols', 'ipfs & storage', 'local-first & crdts', 'dns & naming', 'self-hosting & homelab', 'community networks & isps', 'ham radio'],
  },
  {
    label: 'software & systems',
    tags: ['linux & bsd', 'open source', 'free software licensing', 'security & threat modeling', 'tor & anonymity', 'blockchains & web3', 'ai & agents', 'hardware hacking'],
  },
  {
    label: 'agency & autonomy',
    tags: ['privacy & encryption', 'digital identity', 'interoperability', 'data portability', 'anti-monopoly'],
  },
  {
    label: 'shared power',
    tags: ['co-ops & commons', 'governance & daos', 'funding & sustainability'],
  },
  {
    label: 'humanity & access',
    tags: ['censorship resistance', 'human rights tech', 'accessibility', 'languages & translation', 'journalism & media'],
  },
  {
    label: 'memory & knowledge',
    tags: ['archiving & preservation', 'open knowledge & wikis', 'creative commons', 'indigenous data sovereignty'],
  },
  {
    label: 'supporting each other',
    tags: ['mutual aid', 'collective care', 'community care', 'facilitation & circles', 'moderation & trust', 'codes of conduct'],
  },
  {
    label: 'caring for the land',
    tags: ['land stewardship', 'climate & bioregion', 'resilience & preparedness', 'solar / off-grid', 'repair & reuse', 'permacomputing'],
  },
  {
    section: 'Co-Create',
    sectionSub: 'camp as our collective project · exploring, learning, cooking, eating, playing',
    label: 'bring your gifts',
    tags: ['art & fabulousness', 'craft & making', 'music & jams', 'running a session', 'campfire stories'],
  },
  {
    label: 'explore, cook & play',
    tags: ['forest walks', 'sauna & lake', 'cooking & feasting', 'games & play', 'kids & families'],
  },
  {
    section: 'Co-Here',
    sectionSub: 'collaborations seeded to grow through the year · Cascadia, cross-pollination, this land',
    label: 'seeded to grow',
    tags: ['looking for collaborators', 'year-round projects', 'cross-pollination', 'cascadia local', 'first time at camp'],
  },
  {
    label: 'this place',
    tags: ['salt spring community', 'regenerative practices'],
  },
]

export const ALL_TAGS: readonly string[] = TAG_GROUPS.flatMap((g) => g.tags)
export const ALL_TAGS_SET: ReadonlySet<string> = new Set(ALL_TAGS)

export const MIN_INTERESTS = 1
export const MAX_INTERESTS = 10
export const MAX_LINE_LENGTH = 80
