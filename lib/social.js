const {toUrl, toVaultOrigin} = require('./util')

// exported api
// =

class DStatusFrameworkSocialAPI {
  constructor (dsocialFramework) {
    this.db = dsocialFramework.db
  }

  getProfile (vault) {
    var vaultUrl = toVaultOrigin(vault)
    return this.db.profiles.get(vaultUrl + '/profile.json')
  }

  async setProfile (vault, profile) {
    var vaultUrl = toVaultOrigin(vault)
    await this.db.profiles.upsert(vaultUrl + '/profile.json', profile)
  }

  async setAvatar (vault, imgData, extension) {
    vault = this.db._vaults[toVaultOrigin(vault)]
    if (!vault) throw new Error('Given vault is not indexed by WebDB')
    const filename = `avatar.${extension}`
    await vault.writeFile(filename, imgData, typeof imgData === 'string' ? 'base64' : 'binary')
    return this.db.profiles.upsert(vault.url + '/profile.json', {avatar: filename})
  }

  async follow (vault, target, name) {
    // update the follow record
    var vaultUrl = toVaultOrigin(vault)
    var targetUrl = toVaultOrigin(target)
    var changes = await this.db.profiles.where(':origin').equals(vaultUrl).update(record => {
      record.follows = record.follows || []
      if (!record.follows.find(f => f.url === targetUrl)) {
        record.follows.push({url: targetUrl, name})
      }
      return record
    })
    if (changes === 0) {
      throw new Error('Failed to follow: no profile record exists. Run setProfile() before follow().')
    }
  }

  async unfollow (vault, target) {
    // update the follow record
    var vaultUrl = toVaultOrigin(vault)
    var targetUrl = toVaultOrigin(target)
    var changes = await this.db.profiles.where(':origin').equals(vaultUrl).update(record => {
      record.follows = record.follows || []
      record.follows = record.follows.filter(f => f.url !== targetUrl)
      return record
    })
    if (changes === 0) {
      throw new Error('Failed to unfollow: no profile record exists. Run setProfile() before unfollow().')
    }
  }

  getFollowersQuery (vault) {
    var vaultUrl = toVaultOrigin(vault)
    return this.db.profiles.where('followUrls').equals(vaultUrl)
  }

  listFollowers (vault) {
    return this.getFollowersQuery(vault).toArray()
  }

  countFollowers (vault) {
    return this.getFollowersQuery(vault).count()
  }

  async isFollowing (vaultA, vaultB) {
    var vaultAUrl = toVaultOrigin(vaultA)
    var vaultBUrl = toVaultOrigin(vaultB)
    var profileA = await this.db.profiles.get(vaultAUrl + '/profile.json')
    return profileA.followUrls.indexOf(vaultBUrl) !== -1
  }

  async listFriends (vault) {
    var followers = await this.listFollowers(vault)
    await Promise.all(followers.map(async follower => {
      follower.isFriend = await this.isFollowing(vault, follower.getRecordOrigin())
    }))
    return followers.filter(f => f.isFriend)
  }

  async countFriends (vault) {
    var friends = await this.listFriends(vault)
    return friends.length
  }

  async isFriendsWith (vaultA, vaultB) {
    var [a, b] = await Promise.all([
      this.isFollowing(vaultA, vaultB),
      this.isFollowing(vaultB, vaultA)
    ])
    return a && b
  }
}

module.exports = DStatusFrameworkSocialAPI
