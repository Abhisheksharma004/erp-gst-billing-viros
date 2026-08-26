export interface ParsedUserAgent {
  browser: string
  os: string
  device: string
}

export function parseUserAgent(uaString: string | null | undefined): ParsedUserAgent {
  if (!uaString) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' }
  }

  const ua = uaString

  // Detect OS
  let os = 'Unknown OS'
  if (/windows phone/i.test(ua)) {
    os = 'Windows Phone'
  } else if (/win(dows )?nt 10\.0/i.test(ua)) {
    os = 'Windows 10/11'
  } else if (/win(dows )?nt 6\.3/i.test(ua)) {
    os = 'Windows 8.1'
  } else if (/win(dows )?nt 6\.2/i.test(ua)) {
    os = 'Windows 8'
  } else if (/win(dows )?nt 6\.1/i.test(ua)) {
    os = 'Windows 7'
  } else if (/windows/i.test(ua)) {
    os = 'Windows'
  } else if (/android/i.test(ua)) {
    os = 'Android'
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS'
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS'
  } else if (/linux/i.test(ua)) {
    os = 'Linux'
  } else if (/cros/i.test(ua)) {
    os = 'Chrome OS'
  }

  // Detect Browser
  let browser = 'Unknown Browser'
  if (/edg(e|a|ios)?\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/edg(e|a|ios)?\/([0-9.]+)/i)
    browser = `Edge ${match ? match[2]?.split('.')[0] : ''}`.trim()
  } else if (/opr\/([0-9.]+)|opera/i.test(ua)) {
    const match = ua.match(/opr\/([0-9.]+)/i)
    browser = `Opera ${match ? match[1]?.split('.')[0] : ''}`.trim()
  } else if (/chrome|crios/i.test(ua) && !/edg|opr/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)\/([0-9.]+)/i)
    browser = `Chrome ${match ? match[1]?.split('.')[0] : ''}`.trim()
  } else if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/([0-9.]+)/i)
    browser = `Firefox ${match ? match[1]?.split('.')[0] : ''}`.trim()
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    const match = ua.match(/version\/([0-9.]+)/i)
    browser = `Safari ${match ? match[1]?.split('.')[0] : ''}`.trim()
  } else if (/msie|trident/i.test(ua)) {
    browser = 'Internet Explorer'
  }

  // Detect Device Type
  let device = 'Desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = 'Tablet'
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile/i.test(ua)) {
    device = 'Mobile'
  }

  return { browser, os, device }
}

export function extractClientIp(headers: Headers): string {
  let ip = ''
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (headers.get('x-real-ip')) {
    ip = headers.get('x-real-ip')!.trim()
  } else if (headers.get('cf-connecting-ip')) {
    ip = headers.get('cf-connecting-ip')!.trim()
  }

  if (!ip || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }

  // Clean IPv4-mapped IPv6 prefix (e.g. ::ffff:103.21.58.194 -> 103.21.58.194)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7)
  }

  if (ip === '::1') {
    ip = '127.0.0.1'
  }

  return ip
}
