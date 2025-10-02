<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Sitemap 頁面清單</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; color: #333; }
          h1 { color: #444; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #eee; }
          tr:nth-child(even) { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Sitemap 頁面清單</h1>
        <table>
          <tr>
            <th>網址 (loc)</th>
            <th>最後修改時間 (lastmod)</th>
            <th>更新頻率 (changefreq)</th>
            <th>優先權 (priority)</th>
          </tr>
          <xsl:for-each select="urlset/url">
            <tr>
              <td><a href="{loc}" target="_blank"><xsl:value-of select="loc"/></a></td>
              <td><xsl:value-of select="lastmod"/></td>
              <td><xsl:value-of select="changefreq"/></td>
              <td><xsl:value-of select="priority"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
