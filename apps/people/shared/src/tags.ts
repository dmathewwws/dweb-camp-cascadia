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
    label: 'agency & autonomy',
    tags: ['open source', 'open standards & interoperability', 'free software licensing', 'data portability', 'anti-monopolies', 'privacy & encryption'],
  },
  {
    label: 'protocols & data',
    tags: ['p2p protocols', 'ipfs & storage', 'local-first & crdts', 'blockchains & web3', 'tor', 'decentralized identity', 'web standards'],
  },
  {
    label: 'hardware & repair',
    tags: ['hardware hacking', 'right to repair', 'microcontrollers & sensors', 'mesh networks & lora', 'low-power devices', 'ham radio', 'community networks & isps', 'solar / off-grid', 'repair & reuse', 'permacomputing'],
  },
  {
    label: 'software & self-hosting',
    tags: ['linux', 'self-hosting & homelab', 'local-first ai', 'ai & agents', 'cybersecurity & threat modeling'],
  },
  {
    label: 'the social web',
    tags: ['activitypub & fediverse', 'at protocol & bluesky', 'nostr', 'matrix', 'rss', 'indieweb'],
  },
  {
    label: 'shared power',
    tags: ['co-ops & commons', 'co-housing & intentional communities', 'unions & collective bargaining', 'governance & daos', 'funding & sustainability'],
  },
  {
    label: 'supporting each other',
    tags: ['mutual aid', 'community care', 'facilitation & circles', 'moderation & trust', 'codes of conduct'],
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
    label: 'caring for the land',
    tags: ['land stewardship', 'permaculture', 'soil & composting', 'forests & fire stewardship', 'growing food & gardens', 'food sovereignty', 'climate & bioregion', 'resilience & preparedness'],
  },
  {
    label: 'bring your gifts',
    tags: ['art & crafts', 'music & jams', 'games & play', 'karaoke', 'running a session', 'campfire stories', 'forest walks', 'cooking', 'kids & families'],
  },
  {
    label: 'this place',
    tags: ['salt spring community', 'regenerative practices', 'cascadia local', 'first time at camp', 'second time at camp'],
  },
]

export const ALL_TAGS: readonly string[] = TAG_GROUPS.flatMap((g) => g.tags)
export const ALL_TAGS_SET: ReadonlySet<string> = new Set(ALL_TAGS)

export const MIN_INTERESTS = 1
export const MAX_INTERESTS = 25
export const MAX_LINE_LENGTH = 80

export const MAX_HIGHLIGHTS = 3
export const MAX_HIGHLIGHT_LENGTH = 180
