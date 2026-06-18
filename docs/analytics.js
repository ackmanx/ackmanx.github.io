const analytics_script_tag = document.createElement('script')

analytics_script_tag.defer = true
analytics_script_tag.src = 'https://static.cloudflareinsights.com/beacon.min.js'
analytics_script_tag.setAttribute(
  'data-cf-beacon',
  JSON.stringify({
    token: 'fafca58fc0304523be0fede299408817',
  })
)

document.head.appendChild(analytics_script_tag)
