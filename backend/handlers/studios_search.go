package handlers

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
)

var (
	logoCache  = make(map[string]string)
	videoCache = make(map[string]string)
	cacheMutex sync.RWMutex
	httpClient = &http.Client{Timeout: 5 * time.Second}

	tmdbRegex  = regexp.MustCompile(`https://media\.themoviedb\.org/t/p/[a-zA-Z0-9_]+/[a-zA-Z0-9_-]+\.png`)
	giphyRegex = regexp.MustCompile(`https://media[a-zA-Z0-9\.\-]*giphy\.com/[^"]*giphy\.mp4`)
)

func SearchStudioLogo(c fiber.Ctx) error {
	name := c.Query("name")
	if name == "" {
		return c.Status(400).SendString("Missing name parameter")
	}

	safeName := strings.ReplaceAll(name, "/", "-")
	safeName = strings.ReplaceAll(safeName, "\\", "-")
	kebabName := getKebabCase(safeName)

	// Check local custom logos first
	extensions := []string{"svg", "webp", "png", "jpg"}
	for _, ext := range extensions {
		localPath := fmt.Sprintf("assets/studios/%s.%s", safeName, ext)
		kebabPath := fmt.Sprintf("assets/studios/%s.%s", kebabName, ext)
		
		if _, err := os.Stat(localPath); err == nil {
			return c.SendFile(localPath)
		}
		if _, err := os.Stat(kebabPath); err == nil {
			return c.SendFile(kebabPath)
		}
	}

	cacheMutex.RLock()
	if cachedUrl, ok := logoCache[name]; ok {
		cacheMutex.RUnlock()
		if cachedUrl == "" {
			return c.Status(404).SendString("Logo not found")
		}
		return c.Redirect().Status(302).To(cachedUrl)
	}
	cacheMutex.RUnlock()

	searchUrl := fmt.Sprintf("https://www.themoviedb.org/search/company?query=%s", url.QueryEscape(name))
	
	req, _ := http.NewRequest("GET", searchUrl, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	
	resp, err := httpClient.Do(req)
	if err != nil {
		return c.Status(500).SendString("Failed to fetch TMDB")
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).SendString("Failed to read response")
	}

	match := tmdbRegex.FindString(string(bodyBytes))
	
	if match != "" {
		// Convert from thumbnail size to original size
		// e.g. https://media.themoviedb.org/t/p/w94_and_h141_face/xyz.png -> https://image.tmdb.org/t/p/original/xyz.png
		parts := strings.Split(match, "/")
		filename := parts[len(parts)-1]
		highResMatch := fmt.Sprintf("https://image.tmdb.org/t/p/original/%s", filename)
		
		cacheMutex.Lock()
		logoCache[name] = highResMatch
		cacheMutex.Unlock()

		return c.Redirect().Status(302).To(highResMatch)
	}

	return c.Status(404).SendString("Logo not found")
}

func getKebabCase(name string) string {
	// Remove common punctuation
	name = strings.ReplaceAll(name, ".", "")
	name = strings.ReplaceAll(name, ",", "")
	name = strings.ReplaceAll(name, "'", "")
	return strings.ToLower(strings.ReplaceAll(name, " ", "-"))
}

func SearchStudioVideo(c fiber.Ctx) error {
	name := c.Query("name")
	if name == "" {
		return c.Status(400).SendString("Missing name parameter")
	}

	safeName := strings.ReplaceAll(name, "/", "-")
	safeName = strings.ReplaceAll(safeName, "\\", "-")
	
	videoPath := fmt.Sprintf("assets/studios/%s.mp4", safeName)
	kebabPath := fmt.Sprintf("assets/studios/%s.mp4", getKebabCase(safeName))
	
	if _, err := os.Stat(videoPath); err == nil {
		return c.SendFile(videoPath)
	}
	if _, err := os.Stat(kebabPath); err == nil {
		return c.SendFile(kebabPath)
	}

	return c.Status(404).SendString("Local video not found")
}
