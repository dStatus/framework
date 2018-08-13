# dSocial Framework

**Table of Contents**

- [@dstatus/framework](#dsocial-framework)
  - [Usage](#usage)
    - [Getting started](#getting-started)
    - [Profiles](#profiles)
    - [Social](#social)
    - [Feed](#feed)
    - [Like / Unlike](#like--unlike)
    - [Notifications](#notifications)
  - [API](#api)
    - [new DSocialFramework([opts])](#new-frameworkopts)
    - [dsocial.db](#dsocialdb)
    - [dsocial.setUser(vault)](#dsocialsetuservault)
    - [dsocial.prepareVault(vault)](#dsocialpreparevaultvault)
    - [dsocial.social.getProfile(vault)](#dsocialsocialgetprofilevault)
    - [dsocial.social.setProfile(vault, profile)](#dsocialsocialsetprofilevault-profile)
    - [dsocial.social.setAvatar(vault, imgDataBuffer, extension)](#dsocialsocialsetavatarvault-imgdatabuffer-extension)
    - [dsocial.social.follow(vault, targetUser[, targetUserName])](#dsocialsocialfollowvault-targetuser-targetusername)
    - [dsocial.social.unfollow(vault, targetUser)](#dsocialsocialunfollowvault-targetuser)
    - [dsocial.social.listFollowers(vault)](#dsocialsociallistfollowersvault)
    - [dsocial.social.countFollowers(vault)](#dsocialsocialcountfollowersvault)
    - [dsocial.social.listFriends(vault)](#dsocialsociallistfriendsvault)
    - [dsocial.social.countFriends(vault)](#dsocialsocialcountfriendsvault)
    - [dsocial.social.isFollowing(vaultA, vaultB)](#dsocialsocialisfollowingvaulta-vaultb)
    - [dsocial.social.isFriendsWith(vaultA, vaultB)](#dsocialsocialisfriendswithvaulta-vaultb)
    - [dsocial.feed.post(vault, post)](#dsocialfeedpostvault-post)
    - [dsocial.feed.listPosts([opts])](#dsocialfeedlistpostsopts)
    - [dsocial.feed.countPosts([opts])](#dsocialfeedcountpostsopts)
    - [dsocial.feed.getThread(url[, opts])](#dsocialfeedgetthreadurl-opts)
    - [dsocial.feed.vote(vault, data)](#dsocialfeedvotevault-data)
    - [dsocial.feed.listVotesFor(subject)](#dsocialfeedlistvotesforsubject)
    - [dsocial.notifications.listNotifications([opts])](#dsocialnotificationslistnotificationsopts)
    - [dsocial.notifications.countNotifications([opts])](#dsocialnotificationscountnotificationsopts)

Data definitions and methods for dSocial, a Twitter clone built on top of [dPack CLI](https://github.com/dpack/cli). Uses [dSiteDB](https://github.com/dsocial/dsitedb) to read and write records on the dWeb network.

See the [DSocial app](https://github.com/dsocial/dsocial) to see this library in use.

```js
const DSocialFramework = require('@dstatus/framework')
const dsocial = new DSocialFramework()
await dsocial.db.open()
await dsocial.db.indexVault('dweb://bob.com')
await dsocial.social.getProfile('dweb://bob.com') // => ...
```

Schemas:

 - [Profile](./schemas/profile.json). The schema for user profiles. A very simple "social media" profile: name, bio, profile pic, and a list of followed users.
 - [Post](./schemas/post.json). The schema for feed posts. Like in Twitter, posts are microblog posts, and can be in reply to other DSocial posts.
 - [Vote](./schemas/vote.json). The schema for votes. In DSocial, only upvotes are used.

## Usage

### Getting started

DSocialFramework provides a set of methods to be used on top of a [dSiteDB](https://github.com/dsocial/dsitedb) instance.

Setup will always include the following steps:

```js
// create the dsocialframework instance
const dsocial = new DSocialFramework()
// open the dsitedb
await dsocial.db.open()
```

dSiteDB maintains an index which will determine who shows up in the feed, and whether any read method works for a given vault.
(For instance, you can't call `getProfile()` on an vault that hasn't been indexed.)
You can manage the index's membership using dSiteDB's methods:

```js
// add a user
await dsocial.db.indexVault('dweb://bob.com')
// remove a user
await dsocial.db.unindexVault('dweb://bob.com')
```

You can also add individual files to the index, which is helpful when the user navigates to a thread:

```js
// add an individual file
await dsocial.db.indexFile('dweb://bob.com/posts/1.json')
```

When you create a DWEB vault for the local user, you'll want to call `prepareVault()` to setup the folder structure:

```js
var alice = DWebVault.create({title: 'Alice', description: 'My DSocial profile'})
await dsocial.prepareVault(alice)
```

  - [new DSocialFramework([opts])](#new-dsocialframeworkopts)
  - [dsocial.db](#dsocialdb)
  - [dsocial.setUser(vault)](#dsocialsetuservault)
  - [dsocial.prepareVault(vault)](#dsocialpreparevaultvault)

### Profiles

User profiles include a `name`, `bio`, and an avatar image.

```js
await dsocial.social.setProfile(alice, {
  name: 'Alice',
  bio: 'A cool hacker'
})

await dsocial.social.setAvatar(alice, 'iVBORw...rkJggg==', 'png')

await dsocial.social.getProfile(alice) /* => {
  name: 'Alice',
  bio: 'A cool hacker',
  avatar: '/avatar.png'
} */
```

  - [dsocial.social.getProfile(vault)](#dsocialsocialgetprofilevault)
  - [dsocial.social.setProfile(vault, profile)](#dsocialsocialsetprofilevault-profile)
  - [dsocial.social.setAvatar(vault, imgDataBuffer, extension)](#dsocialsocialsetavatarvault-imgdatabuffer-extension)

### Social

Every user maintains a public list of other users they follow.
You can modify and examine the social graph using these methods.

```js
await dsocial.social.follow(alice, bob)
await dsocial.social.follow(alice, 'dweb://bob.com') // (urls work too)
await dsocial.social.listFollowers(bob) // => [{name: 'Alice', bio: 'A cool hacker', ...}]
```

  - [dsocial.social.follow(vault, targetUser[, targetUserName])](#dsocialsocialfollowvault-targetuser-targetusername)
  - [dsocial.social.unfollow(vault, targetUser)](#dsocialsocialunfollowvault-targetuser)
  - [dsocial.social.listFollowers(vault)](#dsocialsociallistfollowersvault)
  - [dsocial.social.countFollowers(vault)](#dsocialsocialcountfollowersvault)
  - [dsocial.social.listFriends(vault)](#dsocialsociallistfriendsvault)
  - [dsocial.social.countFriends(vault)](#dsocialsocialcountfriendsvault)
  - [dsocial.social.isFollowing(vaultA, vaultB)](#dsocialsocialisfollowingvaulta-vaultb)
  - [dsocial.social.isFriendsWith(vaultA, vaultB)](#dsocialsocialisfriendswithvaulta-vaultb)

### Feed

The feed contains simple text-based posts.

```js
// posting a new thread
await dsocial.feed.post(alice, {
  text: 'Hello, world!',
})

// posting a reply
await dsocial.feed.post(alice, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL(), // url of topmost ancestor message
  createdAt: Date.parse('04 Dec 2017 00:12:00 GMT') // optional
})
```

The list method will show any indexed posts.

```js
await dsocial.feed.listPosts({
  fetchAuthor: true,
  countVotes: true,
  reverse: true,
  rootPostsOnly: true,
  countReplies: true
})
```

You can view the posts of an individual user by adding the `author` filter, and also narrow down the feed to only include the followed users using the `authors` filter.

  - [dsocial.feed.post(vault, post)](#dsocialfeedpostvault-post)
  - [dsocial.feed.listPosts([opts])](#dsocialfeedlistpostsopts)
  - [dsocial.feed.countPosts([opts])](#dsocialfeedcountpostsopts)
  - [dsocial.feed.getThread(url[, opts])](#dsocialfeedgetthreadurl-opts)

### Like / Unlike

Users can like posts using the votes.

```js
await dsocial.feed.vote(alice, {vote: 1, subject: 'dweb://bob.com/posts/1.json'})
await dsocial.feed.listVotesFor('dweb://bob.com/posts/1.json') /* => {
  up: 1,
  down: 0,
  value: 1,
  upVoters: ['dweb://alice.com']
}
```

  - [dsocial.feed.vote(vault, data)](#dsocialfeedvotevault-data)
  - [dsocial.feed.listVotesFor(subject)](#dsocialfeedlistvotesforsubject)

### Notifications

You can view recent notifications (mentions, likes and replies on your posts) using the notifications api.

```js
await dsocial.notifications.listNotifications() /* => [
  { type: 'mention',
    url: 'dweb://bob.com/posts/0jc7w0d5cd.json',
    createdAt: 15155171572345 },
  { type: 'reply',
    url: 'dweb://alice.com/posts/0jc7w07be.json',
    createdAt: 1515517526289 },
  { type: 'vote',
    vote: 1,
    subject: 'dweb://alice.com/posts/0jc7w079o.json',
    origin: 'dweb://bob.com',
    createdAt: 1515517526308 }
]*/
```

 - [dsocial.notifications.listNotifications(opts)](#dsocialnotificationslistnotificationsopts)
 - [dsocial.notifications.countNotifications([opts])](#dsocialnotificationscountnotificationsopts)

## API

### new DSocialFramework([opts])

```js
const dsocial = new DSocialFramework()
```

 - `opts` Object.
   - `mainIndex` String. The name (in the browser) or path (in node) of the main indexes. Defaults to `'dsocial'`.
   - `DWebVault` Constructor. The class constructor for dWeb vault instances. If in node, you should specify [@dstatus/vault](https://npm.im/@dstatus/vault).

Create a new `DSocialFramework` instance.
The `mainIndex` will control where the indexes are stored.
You can specify different names to run multiple DSocialFramework instances at once.

### dsocial.db

The [dSiteDB](https://github.com/distributedweb/dsitedb) instance.

### dsocial.setUser(vault)

```js
dsocial.setUser(alice)
```

 - `vault` DWebVault. The dWeb vault which represents the local user.

Sets the local user. Used in notifications to know which posts should be indexed.

### dsocial.prepareVault(vault)

```js
await dsocial.prepareVault(alice)
```

 - `vault` DWebVault. The vault to prepare for use in dsocial.

Create needed folders for writing to an vault.
This should be called on any vault that represents the local user.

### dsocial.social.getProfile(vault)

```js
await dsocial.social.getProfile(alice) // => {name: 'Alice', bio: 'A cool hacker', avatar: '/avatar.png'}
```

 - `vault` DWebVault or String. The vault to read.

Get the profile data of the given vault.

### dsocial.social.setProfile(vault, profile)

```js
await dsocial.social.setProfile(alice, {name: 'Alice', bio: 'A cool hacker'})
```

 - `vault` DWebVault or String. The vault to modify.
 - `profile` Object.
   - `name` String.
   - `bio` String.

Set the profile data of the given vault.

### dsocial.social.setAvatar(vault, imgDataBuffer, extension)

```js
await dsocial.social.setAvatar(alice, myPngData, 'png')
```

 - `vault` DWebVault or String. The vault to modify.
 - `imgDataBuffer` String, ArrayBuffer, or Buffer. The image data to store. If a string, must be base64-encoded.
 - `extensions` String. The file-extension of the avatar.

Set the avatar image of the given vault.

### dsocial.social.follow(vault, targetUser[, targetUserName])

```js
await dsocial.social.follow(alice, bob, 'Bob')
```

 - `vault` DWebVault or String. The vault to modify.
 - `targetUser` DWebVault or String. The vault to follow.
 - `targetUserName` String. The name of the vault being followed.

Add to the follow-list of the given vault.

### dsocial.social.unfollow(vault, targetUser)

```js
await dsocial.social.unfollow(alice, bob)
```

 - `vault` DWebVault or String. The vault to modify.
 - `targetUser` DWebVault or String. The vault to unfollow.

Remove from the follow-list of the given vault.

### dsocial.social.listFollowers(vault)

```js
await dsocial.social.listFollowers(alice)
```

 - `vault` DWebVault or String. The vault to find followers of.

List users in db that follow the given vault.

### dsocial.social.countFollowers(vault)

```js
await dsocial.social.countFollowers(alice)
```

 - `vault` DWebVault or String. The vault to find followers of.

Count users in db that follow the given vault.

### dsocial.social.listFriends(vault)

```js
await dsocial.social.listFriends(alice)
```

 - `vault` DWebVault or String. The vault to find friends of.

List users in db that mutually follow the given vault.

### dsocial.social.countFriends(vault)

```js
await dsocial.social.countFriends(alice)
```

 - `vault` DWebVault or String. The vault to find friends of.

Count users in db that mutually follow the given vault.


### dsocial.social.isFollowing(vaultA, vaultB)

```js
await dsocial.social.isFollowing(alice, bob) // => true
```

 - `vaultA` DWebVault or String. The vault to test.
 - `vaultB` DWebVault or String. The follow target.

Test if `vaultA` is following `vaultB`.

### dsocial.social.isFriendsWith(vaultA, vaultB)

```js
await dsocial.social.isFriendsWith(alice, bob) // => true
```
 - `vaultA` DWebVault or String.
 - `vaultB` DWebVault or String.

Test if `vaultA` and `vaultB` are mutually following each other.

### dsocial.feed.post(vault, post)

```js
// posting a new thread
await dsocial.feed.post(alice, {
  text: 'Hello, world!',
})

// posting a reply
await dsocial.feed.post(alice, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL() // url of topmost ancestor message
})
```

 - `vault` DWebVault or String. The vault to modify.
 - `post` Object.
   - `text` String. The content of the post.
   - `threadParent` String. The URL of the parent post in the thread. Only needed in a reply; must also include `threadRoot`.
   - `threadRoot` String. The URL of the root post in the thread. Only needed in a reply; must also include `threadParent`.
   - `mentions` Array<{url: String, name: String}. An array of users mentioned in the posts, who should be pinged.

Post a new message to the feed.

### dsocial.feed.listPosts([opts])

```js
await dsocial.feed.listPosts({limit: 30})
```

 - `opts` Object.
   - `author` String | DWebVault. Single-author filter.
   - `authors` Array<String>. Multi-author filter.
   - `rootPostsOnly` Boolean. Remove posts in the feed that are replies
   - `after` Number. Filter out posts created before the given timestamp.
   - `before` Number. Filter out posts created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.
   - `reverse` Boolean. Reverse the order of the output.
   - `fetchAuthor` Boolean. Populate the `.author` attribute of the result objects with the author's profile record.
   - `countReplies` Boolean. Populate the `.replies` attribute of the result objects with number of replies to the post.
   - `countVotes` Boolean. Populate the `.votes` attribute of the result objects with the results of `countVotesFor`.

Fetch a list of posts in the feed index.

### dsocial.feed.countPosts([opts])

```js
await dsocial.feed.countPosts({author: alice})
```

 - `opts` Object.
   - `author` String | DWebVault. Single-author filter.
   - `authors` Array<String>. Multi-author filter.
   - `rootPostsOnly` Boolean. Remove posts in the feed that are replies
   - `after` Number. Filter out posts created before the given timestamp.
   - `before` Number. Filter out posts created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.

Count posts in the feed index.

### dsocial.feed.getThread(url[, opts])

```js
await dsocial.feed.getThread('dweb://alice.com/posts/1.json')
```

 - `url` String. The URL of the thread.
 - `opts` Object.
   - `authors` Array<String>. Filter the posts in the thread down to those published by the given list of vault urls.

Fetch a discussion thread, including all replies.

### dsocial.feed.vote(vault, data)

```js
await dsocial.feed.vote(alice, {
  vote: 1,
  subject: 'dweb://bob.com/posts/1.json'
})
```

 - `vault` DWebVault or String. The vault to modify.
 - `data` Object.
   - `vote` Number. The vote value. Must be -1 (dislike), 0 (no opinion), or 1 (like).
   - `subject` String. The url of the item being voted on.

Publish a vote on the given subject.

### dsocial.feed.listVotesFor(subject)

```js
await dsocial.feed.listVotesFor('dweb://bob.com/posts/1.json')
```

  - `subject` String. The url of the item.

Returns a vote tabulation of the given subject.

### dsocial.notifications.listNotifications([opts])

```js
await dsocial.notifications.listNotifications({limit: 30})
```

 - `opts` Object.
   - `after` Number. Filter out notifications created before the given timestamp.
   - `before` Number. Filter out notifications created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.
   - `reverse` Boolean. Reverse the order of the output.
   - `fetchAuthor` Boolean. Populate the `.author` attribute of the result objects with the author's profile record.
   - `fetchPost` Boolean. Populate the `.post` attribute of the result objects with the post that's the subject of the notification.

Fetch a list of events in the notifications index.

### dsocial.notifications.countNotifications([opts])

```js
await dsocial.notifications.countNotifications()
```

 - `opts` Object.
   - `after` Number. Filter out notifications created before the given timestamp.
   - `before` Number. Filter out notifications created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.

Fetch a count of events in the notifications index.
