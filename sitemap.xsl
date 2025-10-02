<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s">
  
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Sitemap 頁面清單</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; color: #333; }
          h1 { color: #444; }
          p { font-size: 14px; color: #666; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #eee; }
          tr:nth-child(even) { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Sitemap 頁面清單</h1>
        <p>📊 總共有 <xsl:value-of select="count(s:urlset/s:url)"/> 個頁面</p>
        <table>
          <tr>
            <th>網址 (loc)</th>
            <th>最後修改時間 (lastmod)</th>
            <th>更新頻率 (changefreq)</th>
            <th>優先權 (priority)</th>
          </tr>
          <xsl:for-each select="s:urlset/s:url">
            <!-- 依 lastmod 由新到舊排序 -->
            <xsl:sort select="s:lastmod" data-type="text" order="descending"/>
            <tr>
              <td><a href="{s:loc}" target="_blank"><xsl:value-of select="s:loc"/></a></td>
              <td><xsl:value-of select="s:lastmod"/></td>
              <td><xsl:value-of select="s:changefreq"/></td>
              <td><xsl:value-of select="s:priority"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
