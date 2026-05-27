'use client'

import { usePathname } from 'next/navigation'
import { slug } from 'github-slugger'
import { formatDate } from 'pliny/utils/formatDate'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import tagData from 'app/tag-data.json'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const segments = pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const basePath = pathname
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/page\/\d+\/?$/, '') // Remove any trailing /page
    .replace(/\/$/, '') // Remove trailing slash
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            Previous
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            Previous
          </Link>
        )}
        <span>
          {currentPage} of {totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            Next
          </button>
        )}
        {nextPage && (
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            Next
          </Link>
        )}
      </nav>
    </div>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const tagCounts = tagData as Record<string, number>
  const tagKeys = Object.keys(tagCounts)
  const sortedTags = tagKeys.sort((a, b) => tagCounts[b] - tagCounts[a])

  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts

  return (
    <>
      <div>
        <div className="pt-10 pb-8">
          <h1 className="text-5xl leading-none font-semibold text-balance text-[#13182a] sm:hidden dark:text-gray-100">
            {title}
          </h1>
        </div>
        <div className="flex sm:space-x-16">
          <div className="hidden h-full max-h-screen max-w-[240px] min-w-[240px] flex-wrap overflow-auto border-t border-[#c8d0e4] pt-5 sm:flex dark:border-gray-800">
            <div className="py-4 pr-6">
              {pathname.startsWith('/blog') ? (
                <h3 className="text-sm font-medium text-[#27334f] uppercase dark:text-gray-100">
                  All Posts
                </h3>
              ) : (
                <Link
                  href={`/blog`}
                  className="text-sm font-medium text-[#65718a] uppercase transition duration-300 hover:text-[#27334f] dark:text-gray-300 dark:hover:text-gray-100"
                >
                  All Posts
                </Link>
              )}
              <ul>
                {sortedTags.map((t) => {
                  return (
                    <li key={t} className="my-3">
                      {decodeURI(pathname.split('/tags/')[1]) === slug(t) ? (
                        <h3 className="dark:text-primary-300 inline py-2 text-sm font-medium text-[#27334f] uppercase">
                          {`${t} (${tagCounts[t]})`}
                        </h3>
                      ) : (
                        <Link
                          href={`/tags/${slug(t)}`}
                          className="py-2 text-sm font-medium text-[#7a87a1] uppercase transition duration-300 hover:text-[#27334f] dark:text-gray-300 dark:hover:text-gray-100"
                          aria-label={`View posts tagged ${t}`}
                        >
                          {`${t} (${tagCounts[t]})`}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
          <div>
            <ul className="divide-y divide-[#d9dfed] border-t border-[#c8d0e4] dark:divide-gray-800 dark:border-gray-800">
              {!displayPosts.length && (
                <li className="py-8 text-lg leading-8 text-[#65718a] dark:text-gray-400">
                  The archive is empty.
                </li>
              )}
              {displayPosts.map((post) => {
                const { path, date, title, summary, tags } = post
                return (
                  <li key={path} className="py-8">
                    <article className="grid gap-4 xl:grid-cols-[10rem_minmax(0,1fr)] xl:gap-10">
                      <dl>
                        <dt className="sr-only">Published on</dt>
                        <dd className="text-sm leading-6 font-medium text-[#72809d] dark:text-gray-400">
                          <time dateTime={date} suppressHydrationWarning>
                            {formatDate(date, siteMetadata.locale)}
                          </time>
                        </dd>
                      </dl>
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-3xl leading-tight font-semibold">
                            <Link
                              href={`/${path}`}
                              className="dark:hover:text-primary-300 text-[#13182a] transition duration-300 hover:text-[#526ba1] dark:text-gray-100"
                            >
                              {title}
                            </Link>
                          </h2>
                          <div className="flex flex-wrap">
                            {tags?.map((tag) => (
                              <Tag key={tag} text={tag} />
                            ))}
                          </div>
                        </div>
                        <div className="prose max-w-none text-[#65718a] dark:text-gray-400">
                          {summary}
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
            {pagination && pagination.totalPages > 1 && (
              <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
