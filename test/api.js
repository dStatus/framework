const test = require('ava')
const DWebVault = require('@dstatus/vault')
const tempy = require('tempy')
const DSocialFramework = require('../')
const fs = require('fs')

var dsocial

var alice
var bob
var carla

test.before('vault creation', async t => {
  // create the vaults
  ;[alice, bob, carla] = await Promise.all([
    DWebVault.create({title: 'Alice', localPath: tempy.directory()}),
    DWebVault.create({title: 'Bob', localPath: tempy.directory()}),
    DWebVault.create({title: 'Carla', localPath: tempy.directory()})
  ])

  // setup dsocialFramework
  dsocial = new DSocialFramework({mainIndex: tempy.directory(), DWebVault})
  dsocial.setUser(alice)
  await dsocial.db.open()
  await dsocial.prepareVault(alice)
  await dsocial.prepareVault(bob)
  await dsocial.prepareVault(carla)
  await dsocial.db.indexVault([alice, bob, carla])
})

test.after('close db', async t => {
  await dsocial.db.close()
})

test('profile data', async t => {
  // write profiles
  await dsocial.social.setProfile(alice, {
    name: 'Alice',
    bio: 'A cool hacker girl',
    avatar: 'alice.png',
    follows: [{name: 'Bob', url: bob.url}, {name: 'Carla', url: carla.url}]
  })
  await dsocial.social.setProfile(bob, {
    name: 'Bob',
    avatar: 'bob.png',
    bio: 'A cool hacker guy'
  })
  const avatarBuffer = fs.readFileSync('avatar.jpg').buffer
  await dsocial.social.setAvatar(bob, avatarBuffer, 'jpg')
  await dsocial.social.follow(bob, alice, 'Alice')
  await dsocial.social.setProfile(carla, {
    name: 'Carla'
  })
  await dsocial.social.follow(carla, alice)

  // verify data
  t.truthy(await bob.stat('/avatar.jpg'))
  t.deepEqual(profileSubset(await dsocial.social.getProfile(alice)), {
    name: 'Alice',
    bio: 'A cool hacker girl',
    avatar: 'alice.png',
    followUrls: [bob.url, carla.url],
    follows: [{name: 'Bob', url: bob.url}, {name: 'Carla', url: carla.url}]
  })
  t.deepEqual(profileSubset(await dsocial.social.getProfile(bob)), {
    name: 'Bob',
    bio: 'A cool hacker guy',
    avatar: 'avatar.jpg',
    followUrls: [alice.url],
    follows: [{name: 'Alice', url: alice.url}]
  })
  t.deepEqual(profileSubset(await dsocial.social.getProfile(carla)), {
    name: 'Carla',
    bio: undefined,
    avatar: undefined,
    followUrls: [alice.url],
    follows: [{url: alice.url}]
  })
})

test('votes', async t => {
  // vote
  await dsocial.feed.vote(alice, {subject: 'https://dbrowser.io', vote: 1})
  await dsocial.feed.vote(bob, {subject: 'https://dbrowser.io', vote: 1})
  await dsocial.feed.vote(carla, {subject: 'https://dbrowser.io', vote: 1})
  await dsocial.feed.vote(alice, {subject: 'dweb://dbrowser.io', vote: 1})
  await dsocial.feed.vote(bob, {subject: 'dweb://dbrowser.io', vote: 0})
  await dsocial.feed.vote(carla, {subject: 'dweb://dbrowser.io', vote: -1})
  await dsocial.feed.vote(alice, {subject: 'dweb://bob.com/posts/1.json', vote: -1})
  await dsocial.feed.vote(bob, {subject: 'dweb://bob.com/posts/1.json', vote: -1})
  await dsocial.feed.vote(carla, {subject: 'dweb://bob.com/posts/1.json', vote: -1})

  // listVotesFor

  // simple usage
  t.deepEqual(voteSubsets(await dsocial.feed.listVotesFor('https://dbrowser.io')), [
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false },
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false },
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false }
  ])
  // url is normalized
  t.deepEqual(voteSubsets(await dsocial.feed.listVotesFor('https://dbrowser.io/')), [
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false },
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false },
    { subject: 'https://dbrowser.io',
      vote: 1,
      author: false }
  ])
  // simple usage
  t.deepEqual(voteSubsets(await dsocial.feed.listVotesFor('dweb://dbrowser.io')), [
    { subject: 'dweb://dbrowser.io',
      vote: 1,
      author: false },
    { subject: 'dweb://dbrowser.io',
      vote: 0,
      author: false },
    { subject: 'dweb://dbrowser.io',
      vote: -1,
      author: false }
  ])
  // simple usage
  t.deepEqual(voteSubsets(await dsocial.feed.listVotesFor('dweb://bob.com/posts/1.json')), [
    { subject: 'dweb://bob.com/posts/1.json',
      vote: -1,
      author: false },
    { subject: 'dweb://bob.com/posts/1.json',
      vote: -1,
      author: false },
    { subject: 'dweb://bob.com/posts/1.json',
      vote: -1,
      author: false }
  ])

  // countVotesFor

  // simple usage
  t.deepEqual(await dsocial.feed.countVotesFor('https://dbrowser.io'), {
    up: 3,
    down: 0,
    value: 3,
    upVoters: [alice.url, bob.url, carla.url]
  })
  // url is normalized
  t.deepEqual(await dsocial.feed.countVotesFor('https://dbrowser.io/'), {
    up: 3,
    down: 0,
    value: 3,
    upVoters: [alice.url, bob.url, carla.url]
  })
  // simple usage
  t.deepEqual(await dsocial.feed.countVotesFor('dweb://dbrowser.io'), {
    up: 1,
    down: 1,
    value: 0,
    upVoters: [alice.url]
  })
  // simple usage
  t.deepEqual(await dsocial.feed.countVotesFor('dweb://bob.com/posts/1.json'), {
    up: 0,
    down: 3,
    value: -3,
    upVoters: []
  })
})

test('posts', async t => {
  // make some posts
  var post1Url = await dsocial.feed.post(alice, {text: 'First'})
  await dsocial.feed.post(bob, {text: 'Second'})
  await dsocial.feed.post(carla, {text: 'Third'})
  await dsocial.feed.post(bob, {text: '@Alice', mentions: [{ name: 'Alice', url: alice.url }]})
  var reply1Url = await dsocial.feed.post(bob, {
    text: 'First reply',
    threadParent: post1Url,
    threadRoot: post1Url
  })
  await dsocial.feed.post(carla, {
    text: 'Second reply',
    threadParent: reply1Url,
    threadRoot: post1Url
  })
  await dsocial.feed.post(alice, {text: 'Fourth'})

  // add some votes
  await dsocial.feed.vote(bob, {vote: 1, subject: post1Url, subjectType: 'post'})
  await dsocial.feed.vote(carla, {vote: 1, subject: post1Url, subjectType: 'post'})

  // get a thread
  t.deepEqual(postSubset(await dsocial.feed.getThread(post1Url)), {
    author: true,
    text: 'First',
    threadParent: undefined,
    threadRoot: undefined,
    votes: {up: 2, down: 0, value: 2, upVoters: [bob.url, carla.url]},
    replies: [
      {
        author: true,
        text: 'First reply',
        threadParent: post1Url,
        threadRoot: post1Url,
        votes: {up: 0, down: 0, value: 0, upVoters: []},
        replies: [
          {
            author: true,
            text: 'Second reply',
            threadParent: reply1Url,
            threadRoot: post1Url,
            votes: {up: 0, down: 0, value: 0, upVoters: []},
            replies: undefined
          }
        ]
      }
    ]
  })

  // get a thread at the middle
  let threadInTheMiddle = await dsocial.feed.getThread(reply1Url)
  t.deepEqual(postSubset(threadInTheMiddle), {
    author: true,
    text: 'First reply',
    threadParent: post1Url,
    threadRoot: post1Url,
    votes: {up: 0, down: 0, value: 0, upVoters: []},
    replies: [
      {
        author: true,
        text: 'Second reply',
        threadParent: reply1Url,
        threadRoot: post1Url,
        votes: {up: 0, down: 0, value: 0, upVoters: []},
        replies: undefined
      }
    ]
  })
  t.deepEqual(postSubset(threadInTheMiddle.parent), {
    author: true,
    text: 'First',
    threadParent: undefined,
    threadRoot: undefined,
    votes: {up: 2, down: 0, value: 2, upVoters: [bob.url, carla.url]},
    replies: [
      {
        author: true,
        text: 'First reply',
        threadParent: post1Url,
        threadRoot: post1Url,
        votes: {up: 0, down: 0, value: 0, upVoters: []},
        replies: [
          {
            author: true,
            text: 'Second reply',
            threadParent: reply1Url,
            threadRoot: post1Url,
            votes: {up: 0, down: 0, value: 0, upVoters: []},
            replies: undefined
          }
        ]
      }
    ]
  })

  // list posts
  t.deepEqual(postSubsets(await dsocial.feed.listPosts()), [
    { author: false,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: '@Alice',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'First reply',
      threadParent: post1Url,
      threadRoot: post1Url,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Second reply',
      threadParent: reply1Url,
      threadRoot: post1Url,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined }
  ])

  // list posts (no replies)
  t.deepEqual(postSubsets(await dsocial.feed.listPosts({rootPostsOnly: true})), [
    {
      author: false,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: '@Alice',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    }
  ])

  // list posts (authors, votes, and replies)
  t.deepEqual(postSubsets(await dsocial.feed.listPosts({fetchAuthor: true, rootPostsOnly: true, countVotes: true, countReplies: true})), [
    {
      author: true,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 2, down: 0, value: 2, upVoters: [bob.url, carla.url]},
      replies: 2
    },
    {
      author: true,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    },
    {
      author: true,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    },
    {
      author: true,
      text: '@Alice',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    },
    {
      author: true,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    }
  ])

  // list posts (limit, offset, reverse)
  t.deepEqual(postSubsets(await dsocial.feed.listPosts({rootPostsOnly: true, limit: 1, offset: 1, fetchAuthor: true, countVotes: true, countReplies: true})), [
    {
      author: true,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    }
  ])
  t.deepEqual(postSubsets(await dsocial.feed.listPosts({rootPostsOnly: true, reverse: true, limit: 1, offset: 1, fetchAuthor: true, countVotes: true, countReplies: true})), [
    {
      author: true,
      text: '@Alice',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: 0
    }
  ])
})

test('notifications', async (t) => {
  var notifications = await dsocial.notifications.listNotifications({fetchPost: true, fetchAuthor: true})

  t.is(notifications.length, 5)
  t.is(notifications[0].type, 'mention')
  t.is(notifications[0].post.mentions[0].url, alice.url)
  t.is(notifications[0].author.getRecordOrigin(), bob.url)
  t.is(notifications[1].type, 'reply')
  t.truthy(notifications[1].url.startsWith(bob.url))
  t.is(notifications[1].author.getRecordOrigin(), bob.url)
  t.is(notifications[1].post.author.getRecordOrigin(), bob.url)
  t.is(notifications[1].post.text, 'First reply')
  t.is(notifications[2].type, 'reply')
  t.truthy(notifications[2].url.startsWith(carla.url))
  t.is(notifications[2].author.getRecordOrigin(), carla.url)
  t.is(notifications[2].post.author.getRecordOrigin(), carla.url)
  t.is(notifications[2].post.text, 'Second reply')
  t.is(notifications[3].type, 'vote')
  t.is(notifications[3].origin, bob.url)
  t.truthy(notifications[3].subject.startsWith(alice.url))
  t.is(notifications[3].author.getRecordOrigin(), bob.url)
  t.is(notifications[4].type, 'vote')
  t.is(notifications[4].origin, carla.url)
  t.truthy(notifications[4].subject.startsWith(alice.url))
  t.is(notifications[4].author.getRecordOrigin(), carla.url)

  var notifications = await dsocial.notifications.listNotifications({offset: 1, limit: 2, reverse: true})

  t.is(notifications.length, 2)
  t.is(notifications[1].type, 'reply')
  t.truthy(notifications[1].url.startsWith(carla.url))
  t.is(notifications[0].type, 'vote')
  t.is(notifications[0].origin, bob.url)
  t.truthy(notifications[0].subject.startsWith(alice.url))
})

function profileSubset (p) {
  return {
    name: p.name,
    bio: p.bio,
    avatar: p.avatar,
    followUrls: p.followUrls,
    follows: p.follows
  }
}

function voteSubsets (vs) {
  vs = vs.map(voteSubset)
  vs.sort((a, b) => b.vote - a.vote)
  return vs
}

function voteSubset (v) {
  return {
    subject: v.subject,
    vote: v.vote,
    author: !!v.author
  }
}

function postSubsets (ps) {
  ps = ps.map(postSubset)
  return ps
}

function postSubset (p) {
  return {
    author: !!p.author,
    text: p.text,
    threadParent: p.threadParent,
    threadRoot: p.threadRoot,
    votes: p.votes,
    replies: Array.isArray(p.replies) ? postSubsets(p.replies) : p.replies
  }
}
