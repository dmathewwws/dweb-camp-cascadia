import { Link } from 'react-router-dom'
import { formatTime } from '@dweb/photos-shared'
import { imgUrl, type PublicPhoto, type Uploader } from '../lib/api'
import { Avatar } from './Avatar'

interface FrameCardProps {
  photo: PublicPhoto
  frameNo: number
  uploader?: Uploader
}

const pad = (n: number) => String(n).padStart(2, '0')

export function FrameCard({ photo, frameNo, uploader }: FrameCardProps) {
  return (
    <div className="px-[7px] border-b border-dashed border-ink/40 last:border-b-0">
      <div className="frame-tab">
        <span className="no">
          <span className="arrow">▸</span>
          {pad(frameNo)}
        </span>
        <span className="dt">{formatTime(photo.createdAt)}</span>
      </div>
      <Link
        to={`frame/${photo.id}`}
        className="shot"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        aria-label={`Open frame ${frameNo}${uploader?.name ? ` by ${uploader.name}` : ''}`}
      >
        <img src={imgUrl(photo.thumbKey)} alt="" loading="lazy" />
        <div className="vig" />
        <div className="cast" />
        {uploader && (
          <div className="absolute left-2 bottom-2 z-[3]">
            <Avatar avatar={uploader.avatar} name={uploader.name} size="sm" />
          </div>
        )}
      </Link>
    </div>
  )
}
